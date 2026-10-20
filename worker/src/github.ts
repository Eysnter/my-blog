import type { Env } from "./types";
import { countWords, parseDocument, parseTags, POSTS_ROOT, validatePostPath } from "../../shared/admin-content";
export { validatePostPath } from "../../shared/admin-content";

interface GitHubContentResponse {
	content: string;
	encoding: string;
	sha: string;
	path: string;
	html_url?: string;
}

export function requireGitHub(env: Env) {
	if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
		throw new Error("GitHub 尚未配置：需要 GITHUB_TOKEN、GITHUB_OWNER 和 GITHUB_REPO");
	}
	return {
		owner: env.GITHUB_OWNER,
		repo: env.GITHUB_REPO,
		branch: env.GITHUB_BRANCH || "main",
	};
}

export async function githubFetch(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
	const response = await fetch(`https://api.github.com${path}`, {
		...init,
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${env.GITHUB_TOKEN}`,
			"User-Agent": "Firefly-Admin",
			"X-GitHub-Api-Version": "2022-11-28",
			...(init.headers ?? {}),
		},
	});
	if (!response.ok) {
		// Do not relay GitHub's response body: it can contain repository data or token-related details.
		const guidance: Record<number, string> = {
			401: "令牌无效或已过期，请更新 GitHub 令牌",
			403: "访问被拒绝或请求额度已用尽，请检查令牌仓库权限及 GitHub 限流状态",
			404: "未找到仓库、分支或文件，请检查配置与令牌的仓库访问范围",
			409: "文件已发生变化，请重新加载最新内容后再保存",
			422: "提交内容未通过校验，请检查文件版本、分支保护规则及文章路径",
		};
		throw new Error(`GitHub 请求失败（${response.status}）：${guidance[response.status] ?? "服务暂时不可用，请稍后重试"}`);
	}
	return response;
}

export function decodeBase64(value: string): string {
	const binary = atob(value.replaceAll("\n", ""));
	const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

export function encodeBase64(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (let index = 0; index < bytes.length; index += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	}
	return btoa(binary);
}

export function encodeGitHubPath(path: string): string {
	return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

export function summarizePost(content: string, path: string, sha: string) {
	const { fields, body } = parseDocument(content, path);
	return {
		path,
		sha,
		title: fields.title || fields.slug || "未命名文章",
		published: fields.published,
		updated: fields.updated,
		category: fields.category,
		image: fields.image,
		draft: fields.draft,
		description: fields.description,
		tags: parseTags(fields.tags),
		pinned: fields.pinned,
		wordCount: countWords(body),
	};
}

export async function getPost(env: Env, path: string) {
	const { owner, repo, branch } = requireGitHub(env);
	const safePath = validatePostPath(path);
	const response = await githubFetch(
		env,
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeGitHubPath(safePath)}?ref=${encodeURIComponent(branch)}`,
	);
	const data = (await response.json()) as GitHubContentResponse;
	const content = decodeBase64(data.content);
	return { path: data.path, sha: data.sha, content, htmlUrl: data.html_url, summary: summarizePost(content, data.path, data.sha) };
}

export async function listPosts(env: Env) {
	const { owner, repo, branch } = requireGitHub(env);
	const treeResponse = await githubFetch(
		env,
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
	);
	const tree = (await treeResponse.json()) as { tree?: Array<{ path: string; type: string; sha: string }> };
	const files = (tree.tree ?? []).filter(
		(item) => item.type === "blob" && item.path.startsWith(POSTS_ROOT) && /\.(md|mdx)$/iu.test(item.path),
	);

	const results: Array<ReturnType<typeof summarizePost>> = [];
	for (let index = 0; index < files.length; index += 6) {
		const batch = files.slice(index, index + 6);
		const items = await Promise.all(
			batch.map(async (file) => {
				const post = await getPost(env, file.path);
				return post.summary;
			}),
		);
		results.push(...items);
	}
	return results.sort((left, right) => (right.published || "").localeCompare(left.published || ""));
}

export async function savePost(
	env: Env,
	input: { path: string; content: string; sha?: string; message?: string },
) {
	const { owner, repo, branch } = requireGitHub(env);
	const safePath = validatePostPath(input.path);
	const document = parseDocument(input.content, safePath);
	if (!document.hasFrontmatter || !document.fields.title.trim()) {
		throw new Error("文章必须包含 YAML Frontmatter 和 title 字段");
	}
	const response = await githubFetch(
		env,
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeGitHubPath(safePath)}`,
		{
			method: "PUT",
			body: JSON.stringify({
				message: input.message || `${input.sha ? "更新" : "发布"}文章：${safePath.split("/").at(-1)}`,
				content: encodeBase64(input.content),
				sha: input.sha || undefined,
				branch,
			}),
		},
	);
	return response.json();
}

export async function deletePost(env: Env, path: string, sha: string) {
	const { owner, repo, branch } = requireGitHub(env);
	const safePath = validatePostPath(path);
	const response = await githubFetch(
		env,
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeGitHubPath(safePath)}`,
		{
			method: "DELETE",
			body: JSON.stringify({ message: `删除文章：${safePath.split("/").at(-1)}`, sha, branch }),
		},
	);
	return response.json();
}

export async function latestCommit(env: Env) {
	const { owner, repo, branch } = requireGitHub(env);
	const response = await githubFetch(
		env,
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branch)}&per_page=1`,
	);
	const commits = (await response.json()) as Array<{
		sha: string;
		html_url: string;
		commit: { message: string; author?: { date?: string } };
	}>;
	const item = commits[0];
	return item
		? { sha: item.sha, url: item.html_url, message: item.commit.message, date: item.commit.author?.date }
		: null;
}
