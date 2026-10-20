<script lang="ts">
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { onMount } from "svelte";
import {
	buildDocument,
	currentPath,
	newEditorFields,
	parseDocument,
	type EditorFields,
} from "../../../shared/admin-content";
import AccountPanel from "./AccountPanel.svelte";
import EditorPanel from "./EditorPanel.svelte";
import MediaPanel from "./MediaPanel.svelte";
import SettingsPanel from "./SettingsPanel.svelte";
type Screen = "loading" | "unconfigured" | "setup" | "login" | "app";
type Tab =
	| "dashboard"
	| "posts"
	| "drafts"
	| "taxonomy"
	| "editor"
	| "media"
	| "settings"
	| "audit"
	| "account";
type User = { id: string; username: string; role: "owner" | "editor" };
type Post = {
	path: string;
	sha: string;
	title: string;
	published: string;
	updated: string;
	category: string;
	image: string;
	draft: boolean;
	pinned?: boolean;
	tags?: string[];
	description?: string;
	wordCount?: number;
};
type Draft = {
	id: string;
	path: string;
	title: string;
	frontmatter_json: string;
	markdown: string;
	base_github_sha?: string;
	status: string;
	created_at: number;
	updated_at: number;
	username?: string;
};
type MediaItem = { id: string; url: string; file_name: string; alt: string };
let screen = $state<Screen>("loading"),
	tab = $state<Tab>("dashboard"),
	user = $state<User | null>(null),
	csrfToken = $state(""),
	busy = $state(false),
	message = $state(""),
	error = $state("");
let health = $state<Record<string, boolean>>({}),
	dashboard = $state<any>(null),
	posts = $state<Post[]>([]),
	drafts = $state<Draft[]>([]),
	auditItems = $state<any[]>([]);
let postsLoading = $state(false),
	draftsLoading = $state(false),
	auditLoading = $state(false),
	settingsDirty = $state(false);
let loginUsername = $state(""),
	loginPassword = $state(""),
	setupToken = $state("");
let postSearch = $state(""),
	statusFilter = $state("all"),
	categoryFilter = $state("all"),
	postSort = $state("newest"),
	postPage = $state(1);
let editorOpen = $state(false),
	editorSha = $state(""),
	editorOriginalPath = $state(""),
	editorBody = $state(""),
	editorDirty = $state(false),
	editorPreview = $state(false),
	publishUrl = $state("");
let fields = $state<EditorFields>(newEditorFields());
const pageSize = 10;
const navGroups = [
	{
		label: "内容",
		items: [
			{ key: "dashboard", label: "工作台" },
			{ key: "posts", label: "文章" },
			{ key: "drafts", label: "草稿箱" },
			{ key: "taxonomy", label: "分类与标签" },
			{ key: "media", label: "图片库" },
		],
	},
	{
		label: "网站",
		items: [
			{ key: "settings", label: "网站设置" },
			{ key: "audit", label: "操作记录" },
			{ key: "account", label: "账户与安全" },
		],
	},
] as const;
const title = $derived(
	tab === "dashboard"
		? "工作台"
		: tab === "posts"
			? "文章管理"
			: tab === "drafts"
				? "草稿箱"
				: tab === "taxonomy"
					? "分类与标签"
					: tab === "editor"
						? "文章编辑"
						: tab === "media"
							? "图片库"
							: tab === "settings"
								? "网站设置"
								: tab === "audit"
									? "操作记录"
									: "账户与安全",
);
const categories = $derived(
	[...new Set(posts.map((p) => p.category || "未分类"))].sort(),
);
const postFolders = $derived.by(() =>
	[
		...new Set(
			posts
				.map((post) => post.path.replace(/^src\/content\/posts\//u, "").split("/").slice(0, -1).join("/"))
				.filter(Boolean),
		),
	].sort((a, b) => a.localeCompare(b, "zh-CN")),
);
const filteredPosts = $derived.by(() => {
	const q = postSearch.trim().toLowerCase();
	const list = posts.filter(
		(p) =>
			(!q ||
				[p.title, p.path, p.category, p.description, ...(p.tags ?? [])].some(
					(v) => v?.toLowerCase().includes(q),
				)) &&
			(statusFilter === "all" ||
				(statusFilter === "draft" ? p.draft : !p.draft)) &&
			(categoryFilter === "all" || (p.category || "未分类") === categoryFilter),
	);
	return [...list].sort((a, b) =>
		postSort === "title"
			? a.title.localeCompare(b.title, "zh-CN")
			: postSort === "oldest"
				? (a.published || "").localeCompare(b.published || "")
				: (b.published || "").localeCompare(a.published || ""),
	);
});
const postPages = $derived(
		Math.max(1, Math.ceil(filteredPosts.length / pageSize)),
	),
	visiblePosts = $derived(
		filteredPosts.slice((postPage - 1) * pageSize, postPage * pageSize),
	);
const taxonomy = $derived.by(() => {
	const category = new Map<string, number>(),
		tags = new Map<string, number>();
	for (const post of posts) {
		const c = post.category || "未分类";
		category.set(c, (category.get(c) || 0) + 1);
		for (const tag of post.tags ?? []) tags.set(tag, (tags.get(tag) || 0) + 1);
	}
	return {
		category: [...category].sort((a, b) => b[1] - a[1]),
		tags: [...tags].sort((a, b) => b[1] - a[1]),
	};
});
async function request<T = any>(
	path: string,
	init: RequestInit = {},
): Promise<T> {
	const method = (init.method ?? "GET").toUpperCase(),
		headers = new Headers(init.headers);
	if (init.body && !(init.body instanceof FormData))
		headers.set("Content-Type", "application/json");
	if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken)
		headers.set("X-CSRF-Token", csrfToken);
	const response = await fetch(path, {
		...init,
		headers,
		credentials: "same-origin",
	});
	const data = await response
		.json()
		.catch(() => ({ error: `请求失败（${response.status}）` }));
	if (!response.ok) {
		if (response.status === 401 && screen === "app") {
			screen = "login";
			user = null;
			csrfToken = "";
		}
		throw new Error(data.error || `请求失败（${response.status}）`);
	}
	return data as T;
}
function notify(text: string) {
	message = text;
	error = "";
	window.setTimeout(() => {
		if (message === text) message = "";
	}, 4000);
}
function fail(reason: unknown) {
	error = reason instanceof Error ? reason.message : String(reason);
	message = "";
}
function date(value?: string | number) {
	return value
		? new Date(value).toLocaleString("zh-CN", { hour12: false })
		: "—";
}
function hasUnsaved() {
	return (editorOpen && editorDirty) || settingsDirty;
}
onMount(() => {
	void initialize();
	const timer = window.setInterval(() => {
		if (screen === "app" && editorOpen && editorDirty && !busy)
			void saveDraft(true);
	}, 30000);
	const before = (e: BeforeUnloadEvent) => {
		if (hasUnsaved()) {
			e.preventDefault();
			e.returnValue = "";
		}
	};
	const keys = (e: KeyboardEvent) => {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && editorOpen) {
			e.preventDefault();
			void saveDraft(false);
		}
	};
	window.addEventListener("beforeunload", before);
	window.addEventListener("keydown", keys);
	return () => {
		clearInterval(timer);
		window.removeEventListener("beforeunload", before);
		window.removeEventListener("keydown", keys);
	};
});
async function initialize() {
	try {
		const state = await request<{ configured: Record<string, boolean> }>(
			"/api/admin/health",
		);
		health = state.configured;
		if (!health.database) {
			screen = "unconfigured";
			return;
		}
		try {
			const s = await request<{ user: User; csrfToken: string }>(
				"/api/admin/session",
			);
			user = s.user;
			csrfToken = s.csrfToken;
			screen = "app";
			await loadDashboard();
		} catch {
			const status = await request<{ needsSetup: boolean }>(
				"/api/admin/bootstrap/status",
			);
			screen = status.needsSetup ? "setup" : "login";
		}
	} catch (e) {
		fail(e);
		screen = "unconfigured";
	}
}
async function login() {
	busy = true;
	try {
		const r = await request<{ user: User; csrfToken: string }>(
			"/api/admin/login",
			{
				method: "POST",
				body: JSON.stringify({
					username: loginUsername,
					password: loginPassword,
				}),
			},
		);
		user = r.user;
		csrfToken = r.csrfToken;
		loginPassword = "";
		screen = "app";
		await loadDashboard();
	} catch (e) {
		fail(e);
	} finally {
		busy = false;
	}
}
async function setup() {
	busy = true;
	try {
		await request("/api/admin/bootstrap", {
			method: "POST",
			headers: { "X-Setup-Token": setupToken },
			body: JSON.stringify({
				username: loginUsername,
				password: loginPassword,
			}),
		});
		setupToken = "";
		loginPassword = "";
		screen = "login";
		notify("管理员已创建，请登录");
	} catch (e) {
		fail(e);
	} finally {
		busy = false;
	}
}
async function logout() {
	if (hasUnsaved() && !confirm("还有未保存的修改，仍要退出吗？")) return;
	try {
		await request("/api/admin/logout", { method: "POST" });
	} catch {}
	user = null;
	csrfToken = "";
	screen = "login";
}
async function switchTab(next: Tab) {
	if (tab === next) return;
	// 从编辑器挑选媒体时保留正在编辑的文章，选中后可原路返回。
	if (tab === "editor" && next === "media") {
		tab = "media";
		error = "";
		return;
	}
	if (hasUnsaved() && !confirm("当前修改还没有保存，确定离开吗？")) return;
	if (tab === "editor") {
		editorOpen = false;
		editorDirty = false;
	}
	tab = next;
	error = "";
	if (next === "dashboard") await loadDashboard();
	if (next === "posts" || next === "taxonomy") await loadPosts();
	if (next === "drafts") await loadDrafts();
	if (next === "audit") await loadAudit();
}
async function loadDashboard() {
	try {
		dashboard = await request("/api/admin/dashboard");
	} catch (e) {
		fail(e);
	}
}
async function loadPosts(force = false) {
	if (postsLoading || (posts.length && !force)) return;
	postsLoading = true;
	try {
		posts = (await request<{ items: Post[] }>("/api/admin/posts")).items;
		postPage = 1;
	} catch (e) {
		fail(e);
	} finally {
		postsLoading = false;
	}
}
async function loadDrafts() {
	draftsLoading = true;
	try {
		drafts = (await request<{ items: Draft[] }>("/api/admin/drafts")).items;
	} catch (e) {
		fail(e);
	} finally {
		draftsLoading = false;
	}
}
async function loadAudit() {
	auditLoading = true;
	try {
		auditItems = (await request<{ items: any[] }>("/api/admin/audit")).items;
	} catch (e) {
		fail(e);
	} finally {
		auditLoading = false;
	}
}
async function newPost() {
	if (!posts.length) await loadPosts();
	fields = newEditorFields();
	fields.draft = false;
	editorBody = "";
	editorSha = "";
	editorOriginalPath = "";
	editorOpen = true;
	editorDirty = false;
	editorPreview = false;
	publishUrl = "";
	tab = "editor";
}
async function editPost(post: Post) {
	busy = true;
	try {
		const r = await request<{
			item: { path: string; sha: string; content: string };
		}>(`/api/admin/posts?path=${encodeURIComponent(post.path)}`);
		const parsed = parseDocument(r.item.content, r.item.path);
		fields = parsed.fields;
		editorBody = parsed.body;
		editorSha = r.item.sha;
		editorOriginalPath = r.item.path;
		const draft = await request<{ item?: Draft }>(
			`/api/admin/drafts?path=${encodeURIComponent(post.path)}`,
		);
		if (draft.item && confirm("这篇文章有未发布草稿，是否恢复？"))
			restoreDraftData(draft.item);
		else editorDirty = false;
		editorOpen = true;
		editorPreview = false;
		publishUrl = "";
		tab = "editor";
	} catch (e) {
		fail(e);
	} finally {
		busy = false;
	}
}
function restoreDraftData(draft: Draft) {
	try {
		fields = {
			...newEditorFields(),
			...JSON.parse(draft.frontmatter_json || "{}"),
		} as EditorFields;
		editorBody = draft.markdown || "";
		editorSha = draft.base_github_sha || "";
		editorOriginalPath = editorSha ? draft.path : "";
		editorOpen = true;
		editorDirty = false;
		editorPreview = false;
		publishUrl = "";
		tab = "editor";
	} catch (e) {
		fail(e);
	}
}
async function saveDraft(silent = false) {
	if (!fields.title.trim() || !fields.slug.trim()) {
		if (!silent) fail("请先填写标题和文件名");
		return;
	}
	if (busy) return;
	const snapshot = JSON.stringify({
		fields: $state.snapshot(fields),
		body: editorBody,
	});
	busy = true;
	try {
		await request("/api/admin/drafts", {
			method: "PUT",
			body: JSON.stringify({
				path: currentPath(fields),
				title: fields.title,
				frontmatter: $state.snapshot(fields),
				markdown: editorBody,
				baseSha: editorSha || undefined,
			}),
		});
		if (
			snapshot ===
			JSON.stringify({ fields: $state.snapshot(fields), body: editorBody })
		)
			editorDirty = false;
		if (!silent) notify("草稿已保存");
	} catch (e) {
		if (!silent) fail(e);
	} finally {
		busy = false;
	}
}
async function deleteDraft(draft: Draft) {
	if (!confirm(`删除草稿《${draft.title || "未命名"}》？`)) return;
	try {
		await request(`/api/admin/drafts?path=${encodeURIComponent(draft.path)}`, {
			method: "DELETE",
		});
		drafts = drafts.filter((d) => d.path !== draft.path);
		notify("草稿已删除");
	} catch (e) {
		fail(e);
	}
}
async function publishPost() {
	if (!fields.title.trim() || !fields.slug.trim() || !fields.published) {
		fail("标题、文件名和发布日期不能为空");
		return;
	}
	const path = currentPath(fields);
	if (
		editorOriginalPath &&
		path !== editorOriginalPath &&
		!confirm("文件路径改变后会创建新文件并保留旧文件。继续吗？")
	)
		return;
	busy = true;
	try {
		const r = await request<any>("/api/admin/posts", {
			method: "PUT",
			body: JSON.stringify({
				path,
				content: buildDocument(fields, editorBody),
				sha: path === editorOriginalPath ? editorSha : undefined,
				message: `${editorSha ? "更新" : "发布"}文章：${fields.title}`,
			}),
		});
		publishUrl = r.result?.commit?.html_url || "";
		editorDirty = false;
		editorOpen = false;
		posts = [];
		tab = "posts";
		await loadPosts(true);
		notify("文章已提交到仓库，等待构建部署");
	} catch (e) {
		fail(e);
	} finally {
		busy = false;
	}
}
async function removePost(post: Post) {
	if (!confirm(`删除《${post.title}》？这会创建 GitHub 删除提交。`)) return;
	busy = true;
	try {
		await request(
			`/api/admin/posts?path=${encodeURIComponent(post.path)}&sha=${encodeURIComponent(post.sha)}`,
			{ method: "DELETE" },
		);
		posts = posts.filter((p) => p.path !== post.path);
		notify("文章已从仓库删除");
	} catch (e) {
		fail(e);
	} finally {
		busy = false;
	}
}
function renderedPreview() {
	return sanitizeHtml(marked.parse(editorBody, { async: false }) as string, {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat([
			"img",
			"h1",
			"h2",
			"h3",
			"h4",
			"pre",
			"code",
			"table",
		]),
		allowedAttributes: {
			...sanitizeHtml.defaults.allowedAttributes,
			img: ["src", "alt", "title", "loading"],
		},
	});
}
function chooseMedia(item: MediaItem, mode: "cover" | "body") {
	if (mode === "cover") fields.image = item.url;
	else
		editorBody += `${editorBody.endsWith("\n") || !editorBody ? "" : "\n\n"}![${item.alt || item.file_name}](${item.url})\n`;
	editorDirty = true;
	tab = "editor";
}
function openCategory(v: string) {
	categoryFilter = v;
	postSearch = "";
	postPage = 1;
	tab = "posts";
}
function openTag(v: string) {
	postSearch = v;
	categoryFilter = "all";
	postPage = 1;
	tab = "posts";
}
const actionLabels: Record<string, string> = {
	login: "登录",
	logout: "退出",
	upload: "上传图片",
	update: "更新",
	publish: "发布",
	delete: "删除",
	bootstrap: "初始化",
};
</script>

{#if screen==="loading"}<main class="center-screen"><div class="loader"></div><p>正在连接管理后台…</p></main>
{:else if screen==="unconfigured"}<main class="center-screen"><section class="auth-card wide"><div class="brand-mark">E</div><p class="eyebrow">FIREFLY ADMIN</p><h1>后台服务尚未配置</h1><p class="muted">请先绑定 Cloudflare D1、R2 与 GitHub，再刷新本页面。</p><div class="config-list">{#each Object.entries(health) as [key,ready]}<div><span>{key}</span><b class:ready>{ready?"已连接":"待配置"}</b></div>{/each}</div></section></main>
{:else if screen==="login"||screen==="setup"}<main class="center-screen"><section class="auth-card"><a class="auth-brand" href="/">Eysnter <span>Studio</span></a><h1>{screen==="setup"?"创建管理员":"登录内容工作台"}</h1><p class="muted">管理文章、媒体和网站设置。</p><form onsubmit={(e)=>{e.preventDefault();void(screen==="setup"?setup():login());}}>{#if screen==="setup"}<label>初始化令牌<input bind:value={setupToken} type="password" required/></label>{/if}<label>用户名<input bind:value={loginUsername} autocomplete="username" required/></label><label>密码<input bind:value={loginPassword} type="password" autocomplete={screen==="setup"?"new-password":"current-password"} required/></label>{#if error}<p class="form-error">{error}</p>{/if}<button class="button primary full" disabled={busy}>{busy?"正在处理…":screen==="setup"?"创建管理员":"登录"}</button></form><a class="back-link" href="/">← 返回博客</a></section></main>
{:else}<div class="admin-shell"><aside class="sidebar"><a class="brand" href="/admin/"><span class="brand-symbol">E</span><span><strong>Eysnter</strong><small>内容工作台</small></span></a><nav class="sidebar-nav">{#each navGroups as group}<p>{group.label}</p>{#each group.items as item}{#if item.key!=="settings"||user?.role==="owner"}<button class:active={tab===item.key} onclick={()=>void switchTab(item.key as Tab)}><i></i>{item.label}{#if item.key==="drafts"&&dashboard?.drafts}<em>{dashboard.drafts}</em>{/if}</button>{/if}{/each}{/each}</nav><div class="sidebar-footer"><a href="/" target="_blank" rel="noreferrer">查看博客 ↗</a><button onclick={()=>void logout()}>退出登录</button></div></aside>
	<main class="workspace"><header class="topbar"><div class="page-heading"><p>CONTENT STUDIO</p><h1>{title}</h1></div><div class="topbar-actions"><a href="/" target="_blank" rel="noreferrer" class="button secondary">查看站点</a><button class="user-button" onclick={()=>void switchTab("account")}><span>{user?.username.slice(0,1).toUpperCase()}</span><b>{user?.username}</b></button></div></header>{#if message}<div class="toast success">{message}</div>{/if}{#if error}<div class="toast danger"><span>{error}</span><button onclick={()=>error=""}>×</button></div>{/if}{#if publishUrl}<div class="notice">提交已创建，网站需要等待 Cloudflare 完成构建。<a href={publishUrl} target="_blank" rel="noreferrer">查看提交 ↗</a></div>{/if}
	{#if tab==="dashboard"}<section class="dashboard-head"><div><h2>欢迎回来，{user?.username}</h2><p>这里显示内容与服务的真实状态。</p></div><button class="button primary" onclick={newPost}>新建文章</button></section><section class="stats-grid"><article class="stat-card"><span>未发布草稿</span><strong>{dashboard?.drafts??"—"}</strong><button onclick={()=>void switchTab("drafts")}>查看草稿</button></article><article class="stat-card"><span>媒体文件</span><strong>{dashboard?.media??"—"}</strong><small>{dashboard?.mediaBytes?`${(dashboard.mediaBytes/1024/1024).toFixed(1)} MB`:"图片资源库"}</small></article><article class="stat-card"><span>活动会话</span><strong>{dashboard?.activeSessions??"—"}</strong><small>已登录设备</small></article><article class="stat-card"><span>GitHub</span><strong class:good={dashboard?.github?.connected}>{dashboard?.github?.connected?"正常":"异常"}</strong><small>{dashboard?.github?.error||"仓库连接"}</small></article></section><div class="dashboard-grid"><section class="panel"><div class="section-heading"><div><h2>最近发布</h2><p>GitHub 仓库的最后一次提交</p></div></div>{#if dashboard?.latestCommit}<a class="commit-row" href={dashboard.latestCommit.url} target="_blank" rel="noreferrer"><b>{dashboard.latestCommit.message}</b><span>{dashboard.latestCommit.sha.slice(0,8)} · {date(dashboard.latestCommit.date)}</span></a>{:else}<p class="empty">{dashboard?.gitError||"暂无提交信息"}</p>{/if}</section><section class="panel"><div class="section-heading"><div><h2>最近操作</h2><p>账户的内容变更</p></div></div><div class="activity-list">{#each dashboard?.recentActivity??[] as item}<div><span>{actionLabels[item.action]||item.action}</span><p><b>{item.target_id||item.target_type}</b><small>{date(item.created_at)}</small></p></div>{/each}{#if !dashboard?.recentActivity?.length}<p class="empty">暂无操作</p>{/if}</div></section></div>
	{:else if tab==="posts"}<section class="toolbar"><label class="search-box"><span>搜索</span><input bind:value={postSearch} oninput={()=>postPage=1} placeholder="标题、标签、摘要或路径"/></label><select bind:value={statusFilter} onchange={()=>postPage=1}><option value="all">全部状态</option><option value="published">已发布</option><option value="draft">隐藏文章</option></select><select bind:value={categoryFilter} onchange={()=>postPage=1}><option value="all">全部分类</option>{#each categories as c}<option value={c}>{c}</option>{/each}</select><select bind:value={postSort}><option value="newest">最新发布</option><option value="oldest">最早发布</option><option value="title">标题排序</option></select><button class="button secondary" onclick={()=>void loadPosts(true)}>刷新</button><button class="button primary" onclick={newPost}>新建文章</button></section><section class="panel table-panel">{#if postsLoading}<p class="empty">正在读取文章…</p>{:else if !visiblePosts.length}<p class="empty">没有符合条件的文章</p>{:else}<div class="post-table">{#each visiblePosts as post (post.path)}<article><div class="post-cover">{#if post.image}<img src={post.image} alt="" loading="lazy"/>{:else}<span>无封面</span>{/if}</div><div class="post-info"><div class="badges">{#if post.draft}<span class="status-badge draft">隐藏</span>{:else}<span class="status-badge published">已发布</span>{/if}{#if post.pinned}<span class="status-badge">置顶</span>{/if}<button class="chip" onclick={()=>openCategory(post.category||"未分类")}>{post.category||"未分类"}</button></div><h3>{post.title}</h3><p>{post.description||post.path}</p><small>{post.wordCount??0} 字 · {post.path}</small></div><time>{post.published||"未设置日期"}</time><div class="row-actions"><button class="text-button" onclick={()=>void editPost(post)}>编辑</button><button class="text-button danger-link" onclick={()=>void removePost(post)}>删除</button></div></article>{/each}</div><footer class="pagination"><span>共 {filteredPosts.length} 篇</span><div><button disabled={postPage===1} onclick={()=>postPage--}>上一页</button><b>{postPage} / {postPages}</b><button disabled={postPage===postPages} onclick={()=>postPage++}>下一页</button></div></footer>{/if}</section>
	{:else if tab==="drafts"}<section class="section-heading standalone"><div><h2>草稿箱</h2><p>保存在后台数据库中，不会出现在公开博客。</p></div><button class="button secondary" onclick={()=>void loadDrafts()}>刷新</button></section><section class="panel table-panel">{#if draftsLoading}<p class="empty">正在读取草稿…</p>{:else if !drafts.length}<p class="empty">暂无草稿。编辑器会每 30 秒自动保存。</p>{:else}<div class="draft-list">{#each drafts as draft}<article><span class="draft-mark"></span><div><h3>{draft.title||"未命名草稿"}</h3><p>{draft.path}</p><small>更新于 {date(draft.updated_at)}{draft.username?` · ${draft.username}`:""}</small></div><div class="row-actions"><button class="text-button" onclick={()=>restoreDraftData(draft)}>继续编辑</button><button class="text-button danger-link" onclick={()=>void deleteDraft(draft)}>删除</button></div></article>{/each}</div>{/if}</section>
	{:else if tab==="taxonomy"}<section class="taxonomy-grid"><article class="panel"><div class="section-heading"><div><h2>分类</h2><p>点击分类查看对应文章。</p></div></div><div class="term-list">{#each taxonomy.category as [name,total]}<button onclick={()=>openCategory(name)}><span>{name}</span><b>{total}</b></button>{/each}{#if !taxonomy.category.length}<p class="empty">暂无分类</p>{/if}</div></article><article class="panel"><div class="section-heading"><div><h2>标签</h2><p>按文章使用次数排序。</p></div></div><div class="tag-cloud">{#each taxonomy.tags as [name,total]}<button onclick={()=>openTag(name)}>#{name}<span>{total}</span></button>{/each}{#if !taxonomy.tags.length}<p class="empty">暂无标签</p>{/if}</div></article></section>
	{:else if tab==="editor"&&editorOpen}<EditorPanel bind:fields bind:body={editorBody} bind:preview={editorPreview} dirty={editorDirty} {busy} folders={postFolders} {categories} previewHtml={renderedPreview()} onDirty={()=>editorDirty=true} onBack={()=>void switchTab("posts")} onSave={()=>void saveDraft(false)} onPublish={()=>void publishPost()} onChooseMedia={()=>void switchTab("media")}/>
	{:else if tab==="media"}<MediaPanel {request} {notify} {fail} {editorOpen} onChoose={chooseMedia}/>{:else if tab==="settings"&&user?.role==="owner"}<SettingsPanel {request} {notify} {fail} ondirty={(v)=>settingsDirty=v}/>{:else if tab==="audit"}<section class="panel table-panel">{#if auditLoading}<p class="empty">正在读取记录…</p>{:else}<div class="audit-list">{#each auditItems as item}<article><span>{actionLabels[item.action]||item.action}</span><div><b>{item.target_id||item.target_type||"系统"}</b><small>{item.username||"系统"} · {date(item.created_at)}</small></div></article>{/each}{#if !auditItems.length}<p class="empty">暂无操作记录</p>{/if}</div>{/if}</section>{:else if tab==="account"}<AccountPanel {request} {notify} {fail}/>{/if}
	</main></div>{/if}
