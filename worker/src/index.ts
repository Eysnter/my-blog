import { deletePost, getPost, latestCommit, listPosts, savePost } from "./github";
import { matchesImageSignature, publicMediaUrl, RASTER_TYPES, serveMedia } from "./media";
import { handleSettings } from "./settings";
import {
	clearSessionCookie,
	derivePassword,
	parseCookies,
	randomToken,
	sessionCookie,
	sha256,
	timingSafeEqual,
} from "./security";
import type { D1Database, Env, SessionUser } from "./types";

const JSON_HEADERS = {
	"Content-Type": "application/json; charset=utf-8",
	"Cache-Control": "no-store",
	"X-Content-Type-Options": "nosniff",
};

class HttpError extends Error {
	constructor(
		public status: number,
		message: string,
		public code = "request_failed",
	) {
		super(message);
	}
}

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...JSON_HEADERS, ...headers },
	});
}

function requireDatabase(env: Env): D1Database {
	if (!env.DB) throw new HttpError(503, "后台数据库尚未绑定，请先配置 Cloudflare D1", "database_not_configured");
	return env.DB;
}

async function bodyJson<T>(request: Request): Promise<T> {
	try {
		return (await request.json()) as T;
	} catch {
		throw new HttpError(400, "请求内容不是有效的 JSON", "invalid_json");
	}
}

function validateSameOrigin(request: Request) {
	const origin = request.headers.get("Origin");
	if (!origin) return;
	const requestUrl = new URL(request.url);
	let originUrl: URL;
	try {
		originUrl = new URL(origin);
	} catch {
		throw new HttpError(403, "请求来源无效", "invalid_origin");
	}
	if (originUrl.origin !== requestUrl.origin) {
		throw new HttpError(403, "不允许跨站修改后台数据", "origin_rejected");
	}
}

async function audit(
	db: D1Database,
	userId: string | null,
	action: string,
	targetType: string,
	targetId?: string,
	detail: Record<string, unknown> = {},
) {
	await db
		.prepare(
			"INSERT INTO audit_logs (user_id, action, target_type, target_id, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		)
		.bind(userId, action, targetType, targetId ?? null, JSON.stringify(detail), Date.now())
		.run();
}

async function getSession(request: Request, env: Env): Promise<SessionUser | null> {
	const db = requireDatabase(env);
	const token = parseCookies(request).firefly_admin_session;
	if (!token) return null;
	const tokenHash = await sha256(token);
	const row = await db
		.prepare(
			`SELECT users.id, users.username, users.role, sessions.csrf_token
			 FROM sessions JOIN users ON users.id = sessions.user_id
			 WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.status = 'active'`,
		)
		.bind(tokenHash, Date.now())
		.first<{ id: string; username: string; role: "owner" | "editor"; csrf_token: string }>();
	if (!row) return null;
	return { id: row.id, username: row.username, role: row.role, csrfToken: row.csrf_token, sessionHash: tokenHash };
}

async function requireSession(request: Request, env: Env, requireCsrf = false): Promise<SessionUser> {
	const session = await getSession(request, env);
	if (!session) throw new HttpError(401, "登录状态已失效，请重新登录", "unauthorized");
	if (requireCsrf) {
		validateSameOrigin(request);
		const csrf = request.headers.get("X-CSRF-Token") ?? "";
		if (!csrf || !timingSafeEqual(csrf, session.csrfToken)) {
			throw new HttpError(403, "安全令牌无效，请刷新后台后重试", "invalid_csrf");
		}
	}
	return session;
}

async function verifyTurnstile(request: Request, env: Env, token?: string) {
	if (!env.TURNSTILE_SECRET_KEY) return;
	if (!token) throw new HttpError(400, "请完成人机验证", "turnstile_required");
	const form = new FormData();
	form.set("secret", env.TURNSTILE_SECRET_KEY);
	form.set("response", token);
	const ip = request.headers.get("CF-Connecting-IP");
	if (ip) form.set("remoteip", ip);
	const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
		method: "POST",
		body: form,
	});
	const result = (await response.json()) as { success?: boolean };
	if (!result.success) throw new HttpError(403, "人机验证失败，请重试", "turnstile_failed");
}

async function login(request: Request, env: Env): Promise<Response> {
	const db = requireDatabase(env);
	const input = await bodyJson<{ username?: string; password?: string; turnstileToken?: string }>(request);
	const username = (input.username ?? "").trim().toLowerCase();
	const password = input.password ?? "";
	if (!/^[a-zA-Z0-9_.-]{3,40}$/u.test(username) || password.length < 8 || password.length > 256) {
		throw new HttpError(400, "用户名或密码格式不正确", "invalid_credentials");
	}

	const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
	const attemptKey = await sha256(`${username}|${ip}`);
	const attempt = await db
		.prepare("SELECT attempts, window_started_at, locked_until FROM login_attempts WHERE identifier_hash = ?")
		.bind(attemptKey)
		.first<{ attempts: number; window_started_at: number; locked_until: number | null }>();
	if (attempt?.locked_until && attempt.locked_until > Date.now()) {
		throw new HttpError(429, "尝试次数过多，请稍后再登录", "login_locked");
	}
	if ((attempt?.attempts ?? 0) >= 3) await verifyTurnstile(request, env, input.turnstileToken);

	const user = await db
		.prepare(
			"SELECT id, username, password_hash, password_salt, role, status FROM users WHERE username = ? COLLATE NOCASE",
		)
		.bind(username)
		.first<{
			id: string;
			username: string;
			password_hash: string;
			password_salt: string;
			role: "owner" | "editor";
			status: string;
		}>();
	const fallbackSalt = "firefly-invalid-user";
	const candidate = await derivePassword(password, user?.password_salt ?? fallbackSalt, env);
	const valid = Boolean(user && user.status === "active" && timingSafeEqual(candidate, user.password_hash));

	if (!valid) {
		const now = Date.now();
		const freshWindow = !attempt || now - attempt.window_started_at > 15 * 60 * 1000;
		const attempts = freshWindow ? 1 : attempt.attempts + 1;
		const lockedUntil = attempts >= 5 ? now + 15 * 60 * 1000 : null;
		await db
			.prepare(
				`INSERT INTO login_attempts (identifier_hash, attempts, window_started_at, locked_until)
				 VALUES (?, ?, ?, ?)
				 ON CONFLICT(identifier_hash) DO UPDATE SET attempts = excluded.attempts,
				 window_started_at = excluded.window_started_at, locked_until = excluded.locked_until`,
			)
			.bind(attemptKey, attempts, freshWindow ? now : attempt.window_started_at, lockedUntil)
			.run();
		throw new HttpError(401, "用户名或密码错误", "invalid_credentials");
	}

	await db.prepare("DELETE FROM login_attempts WHERE identifier_hash = ?").bind(attemptKey).run();
	const sessionToken = randomToken();
	const tokenHash = await sha256(sessionToken);
	const csrfToken = randomToken(24);
	const now = Date.now();
	await db.batch([
		db
			.prepare(
				"INSERT INTO sessions (token_hash, user_id, csrf_token, created_at, expires_at, ip_hash, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
			)
			.bind(
				tokenHash,
				user!.id,
				csrfToken,
				now,
				now + 7 * 24 * 60 * 60 * 1000,
				await sha256(ip),
				(request.headers.get("User-Agent") ?? "").slice(0, 300),
			),
		db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(now, user!.id),
	]);
	await audit(db, user!.id, "login", "session");
	return json(
		{ user: { id: user!.id, username: user!.username, role: user!.role }, csrfToken },
		200,
		{ "Set-Cookie": sessionCookie(sessionToken) },
	);
}

async function bootstrapStatus(env: Env): Promise<Response> {
	const db = requireDatabase(env);
	const count = (await db.prepare("SELECT COUNT(*) AS count FROM users").first<number>("count")) ?? 0;
	return json({ needsSetup: count === 0, setupTokenConfigured: Boolean(env.ADMIN_SETUP_TOKEN) });
}

async function bootstrap(request: Request, env: Env): Promise<Response> {
	const db = requireDatabase(env);
	if (!env.ADMIN_SETUP_TOKEN) throw new HttpError(503, "尚未配置 ADMIN_SETUP_TOKEN", "setup_not_configured");
	const suppliedToken = request.headers.get("X-Setup-Token") ?? "";
	if (!timingSafeEqual(suppliedToken, env.ADMIN_SETUP_TOKEN)) {
		throw new HttpError(403, "初始化令牌错误", "invalid_setup_token");
	}
	const count = (await db.prepare("SELECT COUNT(*) AS count FROM users").first<number>("count")) ?? 0;
	if (count > 0) throw new HttpError(409, "管理员已经初始化", "already_initialized");
	const input = await bodyJson<{ username?: string; password?: string }>(request);
	const username = (input.username ?? "").trim().toLowerCase();
	const password = input.password ?? "";
	if (!/^[a-zA-Z0-9_.-]{3,40}$/u.test(username)) {
		throw new HttpError(400, "用户名只能包含字母、数字、点、短横线和下划线", "invalid_username");
	}
	if (password.length < 12 || password.length > 256) {
		throw new HttpError(400, "管理员密码至少需要 12 个字符", "weak_password");
	}
	const salt = randomToken(18);
	const passwordHash = await derivePassword(password, salt, env);
	const id = crypto.randomUUID();
	const now = Date.now();
	await db
		.prepare(
			"INSERT INTO users (id, username, password_hash, password_salt, role, status, created_at, password_changed_at) VALUES (?, ?, ?, ?, 'owner', 'active', ?, ?)",
		)
		.bind(id, username, passwordHash, salt, now, now)
		.run();
	await audit(db, id, "bootstrap", "user", id, { username });
	return json({ created: true, username }, 201);
}

async function handleAccount(request: Request, env: Env, session: SessionUser) {
	const db = requireDatabase(env);
	if (request.method === "GET") {
		const [user, result] = await Promise.all([
			db.prepare("SELECT id, username, role, created_at, last_login_at, password_changed_at FROM users WHERE id = ?").bind(session.id).first(),
			db.prepare("SELECT token_hash, created_at, expires_at, user_agent FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY created_at DESC")
				.bind(session.id, Date.now()).all<{ token_hash: string; created_at: number; expires_at: number; user_agent: string }>(),
		]);
		return json({
			user,
			sessions: (result.results ?? []).map(({ token_hash, ...item }) => ({
				...item, hash: token_hash, current: timingSafeEqual(token_hash, session.sessionHash),
			})),
		});
	}
	if (request.method !== "PATCH") throw new HttpError(405, "不支持的请求方式", "method_not_allowed");
	const input = await bodyJson<{ currentPassword?: string; newPassword?: string }>(request);
	if (typeof input.currentPassword !== "string" || input.currentPassword.length > 256) {
		throw new HttpError(400, "请输入当前密码", "invalid_password");
	}
	if (typeof input.newPassword !== "string" || input.newPassword.length < 12 || input.newPassword.length > 256) {
		throw new HttpError(400, "新密码需要 12 至 256 个字符", "weak_password");
	}
	const attemptKey = await sha256(`change-password|${session.id}`);
	const attempt = await db.prepare("SELECT attempts, window_started_at, locked_until FROM login_attempts WHERE identifier_hash = ?")
		.bind(attemptKey).first<{ attempts: number; window_started_at: number; locked_until: number | null }>();
	const now = Date.now();
	if (attempt?.locked_until && attempt.locked_until > now) throw new HttpError(429, "当前密码验证失败次数过多，请 15 分钟后重试", "password_locked");
	const user = await db.prepare("SELECT password_hash, password_salt FROM users WHERE id = ?").bind(session.id)
		.first<{ password_hash: string; password_salt: string }>();
	if (!user || !timingSafeEqual(await derivePassword(input.currentPassword, user.password_salt, env), user.password_hash)) {
		const fresh = !attempt || now - attempt.window_started_at > 15 * 60 * 1000;
		const attempts = fresh ? 1 : attempt.attempts + 1;
		await db.prepare(`INSERT INTO login_attempts (identifier_hash, attempts, window_started_at, locked_until) VALUES (?, ?, ?, ?)
			ON CONFLICT(identifier_hash) DO UPDATE SET attempts = excluded.attempts, window_started_at = excluded.window_started_at, locked_until = excluded.locked_until`)
			.bind(attemptKey, attempts, fresh ? now : attempt.window_started_at, attempts >= 5 ? now + 15 * 60 * 1000 : null).run();
		throw new HttpError(400, "当前密码不正确", "incorrect_password");
	}
	if (input.currentPassword === input.newPassword) throw new HttpError(400, "新密码不能与当前密码相同", "unchanged_password");
	const salt = randomToken(18);
	const passwordHash = await derivePassword(input.newPassword, salt, env);
	// Retain this verified session; all other devices must authenticate again.
	await db.batch([
		db.prepare("UPDATE users SET password_hash = ?, password_salt = ?, password_changed_at = ? WHERE id = ?")
			.bind(passwordHash, salt, now, session.id),
		db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?").bind(session.id, session.sessionHash),
		db.prepare("DELETE FROM login_attempts WHERE identifier_hash = ?").bind(attemptKey),
	]);
	await audit(db, session.id, "change_password", "user", session.id);
	return json({ updated: true, otherSessionsRevoked: true, passwordChangedAt: now });
}

async function revokeSession(env: Env, session: SessionUser, url: URL) {
	const hash = url.searchParams.get("hash") ?? "";
	if (!hash || hash.length > 100) throw new HttpError(400, "缺少有效的会话标识", "invalid_session");
	if (timingSafeEqual(hash, session.sessionHash)) throw new HttpError(400, "当前设备请使用退出登录", "current_session");
	const db = requireDatabase(env);
	const target = await db.prepare("SELECT token_hash FROM sessions WHERE token_hash = ? AND user_id = ?").bind(hash, session.id).first();
	if (!target) throw new HttpError(404, "会话不存在或不属于当前账户", "not_found");
	await db.prepare("DELETE FROM sessions WHERE token_hash = ? AND user_id = ?").bind(hash, session.id).run();
	await audit(db, session.id, "revoke_session", "session");
	return json({ revoked: true });
}

async function dashboard(env: Env, session: SessionUser) {
	const db = requireDatabase(env);
	const [drafts, media, audits, mediaBytes, activeSessions, recentActivity] = await Promise.all([
		db.prepare("SELECT COUNT(*) AS count FROM drafts").first<number>("count"),
		db.prepare("SELECT COUNT(*) AS count FROM media").first<number>("count"),
		db.prepare("SELECT COUNT(*) AS count FROM audit_logs").first<number>("count"),
		db.prepare("SELECT COALESCE(SUM(file_size), 0) AS bytes FROM media").first<number>("bytes"),
		db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE user_id = ? AND expires_at > ?").bind(session.id, Date.now()).first<number>("count"),
		db.prepare("SELECT audit_logs.*, users.username FROM audit_logs LEFT JOIN users ON users.id = audit_logs.user_id ORDER BY audit_logs.created_at DESC LIMIT 8").all(),
	]);
	let commit: unknown = null;
	let gitError = "";
	try {
		commit = await latestCommit(env);
	} catch (error) {
		gitError = error instanceof Error ? error.message : "GitHub 状态读取失败";
	}
	return json({
		drafts: drafts ?? 0, media: media ?? 0, auditEvents: audits ?? 0,
		mediaBytes: mediaBytes ?? 0, activeSessions: activeSessions ?? 0,
		recentActivity: recentActivity.results ?? [], latestCommit: commit, gitError,
		github: { configured: Boolean(env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO), connected: !gitError, error: gitError },
	});
}

async function handleDrafts(request: Request, env: Env, session: SessionUser, url: URL) {
	const db = requireDatabase(env);
	const deserialize = (item: Record<string, unknown> | null) => {
		if (!item) return null;
		let frontmatter: unknown = {};
		try { frontmatter = JSON.parse(String(item.frontmatter_json ?? "{}")); } catch { /* Keep old malformed drafts recoverable. */ }
		return { ...item, frontmatter, baseSha: item.base_github_sha };
	};
	if (request.method === "GET") {
		const path = url.searchParams.get("path");
		if (path) {
			const item = await db.prepare("SELECT * FROM drafts WHERE path = ?").bind(path).first();
			return json({ item: deserialize(item) });
		}
		const result = await db.prepare("SELECT * FROM drafts ORDER BY updated_at DESC LIMIT 100").all();
		const total = await db.prepare("SELECT COUNT(*) AS count FROM drafts").first<number>("count");
		return json({ items: (result.results ?? []).map(deserialize), total: total ?? 0 });
	}
	if (request.method === "PUT") {
		const input = await bodyJson<{
			id?: string;
			path?: string;
			title?: string;
			frontmatter?: Record<string, unknown>;
			markdown?: string;
			baseSha?: string;
		}>(request);
		if (typeof input.path !== "string" || !input.path.startsWith("src/content/posts/")
			|| input.path.includes("\\") || input.path.split("/").some((part) => !part || part === "." || part === "..")
			|| /[\u0000-\u001f\u007f]/u.test(input.path) || !/\.mdx?$/iu.test(input.path)) {
			throw new HttpError(400, "草稿路径无效", "invalid_path");
		}
		if (typeof input.markdown !== "string" || input.markdown.length > 2 * 1024 * 1024) {
			throw new HttpError(400, "草稿正文无效或超过 2 MB", "invalid_markdown");
		}
		if (input.title !== undefined && typeof input.title !== "string") throw new HttpError(400, "草稿标题无效", "invalid_title");
		if (input.frontmatter !== undefined && (!input.frontmatter || typeof input.frontmatter !== "object" || Array.isArray(input.frontmatter))) {
			throw new HttpError(400, "文章属性必须是对象", "invalid_frontmatter");
		}
		if (input.baseSha !== undefined && typeof input.baseSha !== "string") throw new HttpError(400, "文章版本无效", "invalid_sha");
		const existing = await db.prepare("SELECT id FROM drafts WHERE path = ?").bind(input.path).first<{ id: string }>();
		const now = Date.now();
		const id = existing?.id || crypto.randomUUID();
		await db
			.prepare(
				`INSERT INTO drafts (id, path, title, frontmatter_json, markdown, base_github_sha, status, created_at, updated_at, updated_by)
				 VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
				 ON CONFLICT(path) DO UPDATE SET title = excluded.title, frontmatter_json = excluded.frontmatter_json,
				 markdown = excluded.markdown, base_github_sha = excluded.base_github_sha, status = 'draft',
				 updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
			)
			.bind(
				id,
				input.path,
				(input.title ?? "").slice(0, 200),
				JSON.stringify(input.frontmatter ?? {}),
				input.markdown ?? "",
				input.baseSha ?? null,
				now,
				now,
				session.id,
			)
			.run();
		return json({ saved: true, id, updatedAt: now });
	}
	if (request.method === "DELETE") {
		const path = url.searchParams.get("path");
		if (!path) throw new HttpError(400, "缺少草稿路径", "missing_path");
		await db.prepare("DELETE FROM drafts WHERE path = ?").bind(path).run();
		await audit(db, session.id, "delete", "draft", path);
		return json({ deleted: true });
	}
	throw new HttpError(405, "不支持的请求方式", "method_not_allowed");
}

async function handleMedia(request: Request, env: Env, session: SessionUser, url: URL) {
	const db = requireDatabase(env);
	if (!env.MEDIA) throw new HttpError(503, "尚未绑定 R2 媒体桶", "media_not_configured");
	if (request.method === "GET") {
		const query = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
		const requestedPage = Number(url.searchParams.get("page") ?? 1);
		const requestedLimit = Number(url.searchParams.get("limit") ?? 200);
		const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100000) : 1;
		const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 500) : 200;
		const type = url.searchParams.get("type") ?? "";
		const conditions: string[] = [];
		const values: unknown[] = [];
		if (query) {
			conditions.push("(file_name LIKE ? ESCAPE '\\' OR alt LIKE ? ESCAPE '\\')");
			const pattern = `%${query.replace(/[\\%_]/gu, "\\$&")}%`;
			values.push(pattern, pattern);
		}
		if (type) { conditions.push("mime_type = ?"); values.push(type); }
		const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
		const [result, total] = await Promise.all([
			db.prepare(`SELECT * FROM media ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`).bind(...values, limit, (page - 1) * limit).all<{ object_key: string }>(),
			db.prepare(`SELECT COUNT(*) AS count FROM media ${where}`).bind(...values).first<number>("count"),
		]);
		return json({
			items: (result.results ?? []).map((item) => ({ ...item, url: publicMediaUrl(url.origin, item.object_key) })),
			total: total ?? 0, page, limit,
		});
	}
	if (request.method === "POST") {
		const contentLength = Number(request.headers.get("Content-Length") ?? 0);
		if (contentLength > 11 * 1024 * 1024) throw new HttpError(413, "图片不能超过 10 MB", "file_too_large");
		const form = await request.formData();
		const file = form.get("file");
		const alt = String(form.get("alt") ?? "").slice(0, 300);
		if (!(file instanceof File)) throw new HttpError(400, "请选择图片文件", "missing_file");
		const extension = RASTER_TYPES.get(file.type);
		if (!extension) throw new HttpError(400, "仅支持 PNG、JPEG、GIF 和 WebP 图片", "invalid_media_type");
		if (!file.size) throw new HttpError(400, "图片文件为空", "empty_file");
		if (file.size > 10 * 1024 * 1024) throw new HttpError(413, "图片不能超过 10 MB", "file_too_large");
		const stem = file.name
			.replace(/\.[^.]+$/u, "")
			.normalize("NFKC")
			.replace(/[^\p{L}\p{N}_-]+/gu, "-")
			.replace(/^-+|-+$/gu, "")
			.slice(0, 60) || "image";
		const now = Date.now();
		const id = crypto.randomUUID();
		const objectKey = `file/posts/Title/${now}_${id.slice(0, 8)}_${stem}.${extension}`;
		const buffer = await file.arrayBuffer();
		if (!matchesImageSignature(new Uint8Array(buffer), file.type)) throw new HttpError(400, "图片内容与格式不匹配，请重新导出图片", "invalid_media_signature");
		const digest = await sha256(buffer);
		await env.MEDIA.put(objectKey, buffer, {
			httpMetadata: { contentType: file.type, cacheControl: "public, max-age=2592000" },
			customMetadata: { originalName: file.name, uploadedBy: session.username },
		});
		const mediaUrl = publicMediaUrl(url.origin, objectKey);
		await db
			.prepare(
				"INSERT INTO media (id, object_key, url, file_name, mime_type, file_size, alt, sha256, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.bind(id, objectKey, mediaUrl, file.name.slice(0, 200), file.type, file.size, alt, digest, now, session.id)
			.run();
		await audit(db, session.id, "upload", "media", id, { objectKey, fileSize: file.size });
		return json({ item: { id, object_key: objectKey, url: mediaUrl, file_name: file.name.slice(0, 200), mime_type: file.type, file_size: file.size, alt, created_at: now } }, 201);
	}
	if (request.method === "PATCH") {
		const input = await bodyJson<{ id?: string; file_name?: string; fileName?: string; alt?: string }>(request);
		if (typeof input.id !== "string" || !input.id) throw new HttpError(400, "缺少图片 ID", "missing_id");
		const item = await db.prepare("SELECT * FROM media WHERE id = ?").bind(input.id).first<{ file_name: string; alt: string; object_key: string }>();
		if (!item) throw new HttpError(404, "图片不存在", "not_found");
		const fileName = input.file_name ?? input.fileName ?? item.file_name;
		const alt = input.alt ?? item.alt;
		if (typeof fileName !== "string" || !fileName.trim() || fileName.length > 200 || /[\u0000-\u001f\u007f]/u.test(fileName)) {
			throw new HttpError(400, "图片名称需要 1 至 200 个字符", "invalid_name");
		}
		if (typeof alt !== "string" || alt.length > 300) throw new HttpError(400, "替代文本最多 300 个字符", "invalid_alt");
		await db.prepare("UPDATE media SET file_name = ?, alt = ? WHERE id = ?").bind(fileName.trim(), alt, input.id).run();
		await audit(db, session.id, "update", "media", input.id);
		return json({ updated: true, item: { ...item, file_name: fileName.trim(), alt, url: publicMediaUrl(url.origin, item.object_key) } });
	}
	if (request.method === "DELETE") {
		const id = url.searchParams.get("id");
		if (!id) throw new HttpError(400, "缺少图片 ID", "missing_id");
		const item = await db.prepare("SELECT object_key FROM media WHERE id = ?").bind(id).first<{ object_key: string }>();
		if (!item) throw new HttpError(404, "图片不存在", "not_found");
		await env.MEDIA.delete(item.object_key);
		await db.prepare("DELETE FROM media WHERE id = ?").bind(id).run();
		await audit(db, session.id, "delete", "media", id, { objectKey: item.object_key });
		return json({ deleted: true });
	}
	throw new HttpError(405, "不支持的请求方式", "method_not_allowed");
}

async function handleApi(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const path = url.pathname.replace(/\/+$/u, "") || "/";

	if (path === "/api/admin/health" && request.method === "GET") {
		return json({
			ok: true,
			configured: {
				database: Boolean(env.DB),
				media: Boolean(env.MEDIA),
				github: Boolean(env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO),
				passwordPepper: Boolean(env.PASSWORD_PEPPER),
				setupToken: Boolean(env.ADMIN_SETUP_TOKEN),
			},
		});
	}
	if (path === "/api/admin/bootstrap/status" && request.method === "GET") return bootstrapStatus(env);
	if (path === "/api/admin/bootstrap" && request.method === "POST") {
		validateSameOrigin(request);
		return bootstrap(request, env);
	}
	if (path === "/api/admin/login" && request.method === "POST") {
		validateSameOrigin(request);
		return login(request, env);
	}

	const mutating = !["GET", "HEAD", "OPTIONS"].includes(request.method);
	const session = await requireSession(request, env, mutating);
	const db = requireDatabase(env);

	if (path === "/api/admin/session" && request.method === "GET") {
		return json({ user: { id: session.id, username: session.username, role: session.role }, csrfToken: session.csrfToken });
	}
	if (path === "/api/admin/logout" && request.method === "POST") {
		await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(session.sessionHash).run();
		await audit(db, session.id, "logout", "session");
		return json({ loggedOut: true }, 200, { "Set-Cookie": clearSessionCookie() });
	}
	if (path === "/api/admin/account") return handleAccount(request, env, session);
	if (path === "/api/admin/sessions" && request.method === "DELETE") return revokeSession(env, session, url);
	if (path === "/api/admin/dashboard" && request.method === "GET") return dashboard(env, session);
	if (path === "/api/admin/settings") return handleSettings(request, env, session);
	if (path === "/api/admin/posts" && request.method === "GET") {
		const postPath = url.searchParams.get("path");
		return json(postPath ? { item: await getPost(env, postPath) } : { items: await listPosts(env) });
	}
	if (path === "/api/admin/posts" && request.method === "PUT") {
		const input = await bodyJson<{ path: string; content: string; sha?: string; message?: string }>(request);
		const result = await savePost(env, input);
		await db.prepare("DELETE FROM drafts WHERE path = ?").bind(input.path).run();
		await audit(db, session.id, input.sha ? "update" : "publish", "post", input.path);
		return json({ saved: true, result });
	}
	if (path === "/api/admin/posts" && request.method === "DELETE") {
		const postPath = url.searchParams.get("path");
		const sha = url.searchParams.get("sha");
		if (!postPath || !sha) throw new HttpError(400, "缺少文章路径或 SHA", "missing_parameters");
		const result = await deletePost(env, postPath, sha);
		await audit(db, session.id, "delete", "post", postPath);
		return json({ deleted: true, result });
	}
	if (path === "/api/admin/drafts") return handleDrafts(request, env, session, url);
	if (path === "/api/admin/media") return handleMedia(request, env, session, url);
	if (path === "/api/admin/audit" && request.method === "GET") {
		const result = await db
			.prepare(
				"SELECT audit_logs.*, users.username FROM audit_logs LEFT JOIN users ON users.id = audit_logs.user_id ORDER BY audit_logs.created_at DESC LIMIT 100",
			)
			.all();
		return json({ items: result.results ?? [] });
	}
	throw new HttpError(404, "后台接口不存在", "not_found");
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname.startsWith("/media/")) return serveMedia(request, env);
		if (!url.pathname.startsWith("/api/admin/")) return env.ASSETS.fetch(request);
		if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });
		try {
			return await handleApi(request, env);
		} catch (error) {
			if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
			const message = error instanceof Error ? error.message : "未知错误";
			console.error("Admin API error", error);
			return json({ error: message, code: "internal_error" }, 500);
		}
	},
};
