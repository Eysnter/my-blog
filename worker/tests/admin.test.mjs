import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import ts from "typescript";

// Run the actual Worker against SQLite without deploying or touching remote D1.
registerHooks({
	resolve(specifier, context, nextResolve) {
		try { return nextResolve(specifier, context); }
		catch (error) {
			if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[a-z]+$/iu.test(specifier)) {
				return nextResolve(`${specifier}.ts`, context);
			}
			throw error;
		}
	},
	load(url, context, nextLoad) {
		if (url.endsWith("/src/config/admin-settings.json")) {
			return {
				format: "module",
				shortCircuit: true,
				source: `export default ${readFileSync(new URL(url), "utf8")}`,
			};
		}
		// Worker settings reuse the site's typed config modules, so transpile all
		// project TypeScript imports (not dependencies) in this Node test harness.
		if (url.endsWith(".ts") && !url.includes("/node_modules/")) {
			return {
				format: "module", shortCircuit: true,
				source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
					compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
				}).outputText,
			};
		}
		return nextLoad(url, context);
	},
});

const { default: worker } = await import("../src/index.ts");
const { derivePassword, sha256 } = await import("../src/security.ts");
const { matchesImageSignature } = await import("../src/media.ts");
const origin = "https://blog.example.test";
const currentToken = "current-session-token";
const currentCsrf = "csrf-current-session";
const oldPassword = "old-password-12345";

async function fixture() {
	const sqlite = new DatabaseSync(":memory:");
	sqlite.exec(readFileSync(new URL("../../migrations/0001_admin.sql", import.meta.url), "utf8"));
	const DB = {
		prepare(sql) {
			let values = [];
			return {
				bind(...parameters) { values = parameters; return this; },
				async first(column) { const result = sqlite.prepare(sql).get(...values); return result ? (column ? result[column] : { ...result }) : null; },
				async all() { return { success: true, results: sqlite.prepare(sql).all(...values).map((item) => ({ ...item })) }; },
				async run() { const result = sqlite.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } }; },
			};
		},
		async batch(statements) {
			sqlite.exec("BEGIN");
			try { const result = []; for (const statement of statements) result.push(await statement.run()); sqlite.exec("COMMIT"); return result; }
			catch (error) { sqlite.exec("ROLLBACK"); throw error; }
		},
	};
	const objects = new Map();
	const MEDIA = {
		async put(key, value, metadata) { objects.set(key, { value, metadata }); },
		async get(key) {
			const object = objects.get(key);
			if (!object) return null;
			return {
				body: new Response(object.value).body, httpEtag: '"test-etag"',
				writeHttpMetadata(headers) { headers.set("Content-Type", object.metadata.httpMetadata.contentType); },
			};
		},
		async delete(key) { objects.delete(key); },
	};
	const env = { DB, MEDIA, PASSWORD_PEPPER: "test-pepper", ASSETS: { fetch: () => new Response("asset") } };
	const passwordHash = await derivePassword(oldPassword, "salt", env);
	const now = Date.now();
	for (const id of ["owner", "other"]) {
		sqlite.prepare("INSERT INTO users (id,username,password_hash,password_salt,role,status,created_at,password_changed_at) VALUES (?,?,?,?,'owner','active',?,?)")
			.run(id, id, passwordHash, "salt", now, now);
	}
	const hashes = {
		current: await sha256(currentToken), second: await sha256("second"), foreign: await sha256("foreign"),
	};
	for (const [name, hash] of Object.entries(hashes)) {
		sqlite.prepare("INSERT INTO sessions (token_hash,user_id,csrf_token,created_at,expires_at,user_agent) VALUES (?,?,?,?,?,?)")
			.run(hash, name === "foreign" ? "other" : "owner", currentCsrf, now, now + 86400000, `browser-${name}`);
	}
	async function request(path, options = {}) {
		const { json: payload, anonymous, csrf = true, ...rest } = options;
		const headers = new Headers(rest.headers);
		if (!anonymous) headers.set("Cookie", `firefly_admin_session=${currentToken}`);
		if (csrf) headers.set("X-CSRF-Token", currentCsrf);
		if (payload !== undefined) headers.set("Content-Type", "application/json");
		return worker.fetch(new Request(`${origin}${path}`, { ...rest, headers, body: payload === undefined ? rest.body : JSON.stringify(payload) }), env);
	}
	return { sqlite, env, request, hashes, objects };
}

test("account reads only own sessions; foreign/current sessions cannot be revoked", async () => {
	const f = await fixture();
	try {
		const account = await (await f.request("/api/admin/account")).json();
		assert.equal(account.user.username, "owner");
		assert.equal(account.sessions.length, 2);
		assert.equal(account.sessions.filter((item) => item.current).length, 1);
		assert.ok(account.sessions.every((item) => !("password_hash" in item) && !("csrf_token" in item)));
		assert.equal((await f.request(`/api/admin/sessions?hash=${f.hashes.foreign}`, { method: "DELETE" })).status, 404);
		assert.equal((await f.request(`/api/admin/sessions?hash=${f.hashes.current}`, { method: "DELETE" })).status, 400);
		assert.equal((await f.request(`/api/admin/sessions?hash=${f.hashes.second}`, { method: "DELETE", csrf: false })).status, 403);
		assert.equal((await f.request(`/api/admin/sessions?hash=${f.hashes.second}`, { method: "DELETE" })).status, 200);
		assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='other'").get().n, 1);
	} finally { f.sqlite.close(); }
});

test("password change verifies old password and revokes other devices only", async () => {
	const f = await fixture();
	try {
		assert.equal((await f.request("/api/admin/account", { method: "PATCH", json: { currentPassword: oldPassword, newPassword: "short" } })).status, 400);
		assert.equal((await f.request("/api/admin/account", { method: "PATCH", json: { currentPassword: "incorrect", newPassword: "new-password-12345" } })).status, 400);
		assert.equal((await f.request("/api/admin/account", { method: "PATCH", json: { currentPassword: oldPassword, newPassword: "new-password-12345" } })).status, 200);
		const stored = f.sqlite.prepare("SELECT password_hash,password_salt FROM users WHERE id='owner'").get();
		assert.equal(stored.password_hash, await derivePassword("new-password-12345", stored.password_salt, f.env));
		assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='owner'").get().n, 1);
		assert.equal((await f.request("/api/admin/account")).status, 200);
		assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='other'").get().n, 1);
	} finally { f.sqlite.close(); }
});

test("repeated incorrect password changes are locked", async () => {
	const f = await fixture();
	try {
		for (let i = 0; i < 5; i++) {
			assert.equal((await f.request("/api/admin/account", { method: "PATCH", json: { currentPassword: "bad", newPassword: "new-password-12345" } })).status, 400);
		}
		assert.equal((await f.request("/api/admin/account", { method: "PATCH", json: { currentPassword: oldPassword, newPassword: "new-password-12345" } })).status, 429);
	} finally { f.sqlite.close(); }
});

test("image signature detection rejects executable/mislabeled content", () => {
	const html = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");
	assert.equal(matchesImageSignature(html, "image/png"), false);
	assert.equal(matchesImageSignature(html, "image/svg+xml"), false);
	assert.equal(matchesImageSignature(new Uint8Array([255, 216, 255, 224]), "image/jpeg"), true);
	assert.equal(matchesImageSignature(new TextEncoder().encode("GIF89a1234567"), "image/gif"), true);
	assert.equal(matchesImageSignature(new TextEncoder().encode("RIFF1234WEBPVP8 1234"), "image/webp"), true);
});

test("media uploads, metadata edits, search and public serving work together", async () => {
	const f = await fixture();
	try {
		const upload = (body, type, name) => {
			const form = new FormData();
			form.set("file", new File([body], name, { type }));
			form.set("alt", "山间日落");
			return f.request("/api/admin/media", { method: "POST", body: form });
		};
		assert.equal((await upload("<svg></svg>", "image/svg+xml", "x.svg")).status, 400);
		assert.equal((await upload("<html>not a png</html>", "image/png", "x.png")).status, 400);
		const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1cAAAAASUVORK5CYII=", "base64"));
		const response = await upload(png, "image/png", "sunset.html");
		assert.equal(response.status, 201);
		const { item } = await response.json();
		assert.ok(item.url.startsWith(`${origin}/media/`));
		assert.ok(item.object_key.endsWith(".png"));
		assert.equal((await f.request("/api/admin/media", { method: "PATCH", json: { id: item.id, fileName: "夕阳", alt: "云与山" } })).status, 200);
		const filtered = await (await f.request("/api/admin/media?q=" + encodeURIComponent("云") + "&type=image/png&limit=24")).json();
		assert.equal(filtered.total, 1);
		assert.equal(filtered.items[0].file_name, "夕阳");
		assert.equal((await (await f.request("/api/admin/media?type=image/jpeg")).json()).total, 0);
		assert.equal((await (await f.request("/api/admin/media?q=%25")).json()).total, 0);
		const publicPath = new URL(item.url).pathname;
		const publicImage = await f.request(publicPath, { anonymous: true });
		assert.equal(publicImage.status, 200);
		assert.equal(publicImage.headers.get("Content-Type"), "image/png");
		assert.equal(publicImage.headers.get("X-Content-Type-Options"), "nosniff");
		assert.equal((await publicImage.arrayBuffer()).byteLength, png.byteLength);
		assert.equal((await f.request(publicPath, { anonymous: true, method: "HEAD" })).status, 200);
		assert.equal((await f.request(publicPath, { anonymous: true, headers: { "If-None-Match": '"test-etag"' } })).status, 304);
		assert.equal((await f.request("/media/unknown.png", { anonymous: true })).status, 404);
		assert.equal((await f.request(`/api/admin/media?id=${item.id}`, { method: "DELETE" })).status, 200);
		assert.equal((await f.request(publicPath, { anonymous: true })).status, 404);
	} finally { f.sqlite.close(); }
});

test("draft recovery preserves frontmatter and stable id; path traversal is rejected", async () => {
	const f = await fixture();
	try {
		const draft = { path: "src/content/posts/a.md", title: "测试", markdown: "body", frontmatter: { title: "测试", tags: ["test"] }, baseSha: "original" };
		const first = await (await f.request("/api/admin/drafts", { method: "PUT", json: draft })).json();
		const second = await (await f.request("/api/admin/drafts", { method: "PUT", json: { ...draft, markdown: "edited" } })).json();
		assert.equal(first.id, second.id);
		const restored = await (await f.request("/api/admin/drafts?path=src/content/posts/a.md")).json();
		assert.equal(restored.item.markdown, "edited");
		assert.deepEqual(restored.item.frontmatter.tags, ["test"]);
		assert.equal(restored.item.baseSha, "original");
		assert.equal((await f.request("/api/admin/drafts", { method: "PUT", json: { ...draft, path: "src/content/posts/../outside.md" } })).status, 400);
		const dashboard = await (await f.request("/api/admin/dashboard")).json();
		assert.equal(dashboard.drafts, 1);
		assert.equal(dashboard.activeSessions, 2);
		assert.equal(dashboard.github.connected, false);
		assert.ok(dashboard.gitError);
	} finally { f.sqlite.close(); }
});

test("dashboard distinguishes stored GitHub configuration from a working connection", async () => {
	const f = await fixture();
	const previousFetch = globalThis.fetch;
	try {
		Object.assign(f.env, { GITHUB_TOKEN: "test-only-invalid-token", GITHUB_OWNER: "owner", GITHUB_REPO: "blog" });
		globalThis.fetch = async () => new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 });
		const failed = await (await f.request("/api/admin/dashboard")).json();
		assert.equal(failed.github.configured, true);
		assert.equal(failed.github.connected, false);
		globalThis.fetch = async () => new Response(JSON.stringify([{ sha: "abc", html_url: "https://github.com/owner/blog/commit/abc", commit: { message: "update post", author: { date: "2026-10-20" } } }]));
		const connected = await (await f.request("/api/admin/dashboard")).json();
		assert.equal(connected.github.connected, true);
		assert.equal(connected.latestCommit.sha, "abc");
	} finally { globalThis.fetch = previousFetch; f.sqlite.close(); }
});

test("anonymous and cross-origin requests cannot edit account data", async () => {
	const f = await fixture();
	try {
		assert.equal((await f.request("/api/admin/account", { anonymous: true })).status, 401);
		assert.equal((await f.request("/api/admin/account", {
			method: "PATCH", headers: { Origin: "https://untrusted.example" },
			json: { currentPassword: oldPassword, newPassword: "new-password-12345" },
		})).status, 403);
	} finally { f.sqlite.close(); }
});
