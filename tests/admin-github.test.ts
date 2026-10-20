import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import type { Env } from "../worker/src/types.ts";

// The Worker uses bundler resolution; resolve its extensionless TypeScript imports in Node tests.
registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier.startsWith(".") && !/\.[a-z]+$/iu.test(specifier)) {
			return nextResolve(`${specifier}.ts`, context);
		}
		return nextResolve(specifier, context);
	},
});
const { getPost, savePost, deletePost, githubFetch, encodeBase64 } = await import("../worker/src/github.ts");
const env = {
	GITHUB_OWNER: "owner", GITHUB_REPO: "blog", GITHUB_BRANCH: "main",
	GITHUB_TOKEN: "test-token", ASSETS: { fetch: async () => new Response() },
} satisfies Env;
const path = "src/content/posts/教程/中文 #1? 100%.md";
const encodedPath = "src/content/posts/%E6%95%99%E7%A8%8B/%E4%B8%AD%E6%96%87%20%231%3F%20100%25.md";
const content = '---\n"title": "带引号的标题"\npublished: 2026-10-20\ntags:\n  - Linux\npinned: true\ndescription: |\n  第一行\n  第二行\n---\n\nHello 世界\n';

test("reading a post encodes every path segment and returns parsed metadata", async (t) => {
	t.mock.method(globalThis, "fetch", async (url: string) => {
		assert.equal(url, `https://api.github.com/repos/owner/blog/contents/${encodedPath}?ref=main`);
		return Response.json({ path, sha: "version-1", content: encodeBase64(content), encoding: "base64" });
	});
	const post = await getPost(env, path);
	assert.equal(post.content, content);
	assert.deepEqual(post.summary.tags, ["Linux"]);
	assert.equal(post.summary.description, "第一行\n第二行\n");
	assert.equal(post.summary.pinned, true);
	assert.equal(post.summary.wordCount, 3);
});

test("saving accepts valid YAML quoted keys and encodes the GitHub write URL", async (t) => {
	t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
		assert.equal(url, `https://api.github.com/repos/owner/blog/contents/${encodedPath}`);
		assert.equal(init.method, "PUT");
		const body = JSON.parse(init.body as string);
		assert.equal(body.sha, "version-1");
		assert.equal(body.content, encodeBase64(content));
		return Response.json({ content: { sha: "version-2" } });
	});
	await savePost(env, { path, content, sha: "version-1" });
});

test("deleting encodes special characters rather than treating them as a query or fragment", async (t) => {
	t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
		assert.equal(url, `https://api.github.com/repos/owner/blog/contents/${encodedPath}`);
		assert.equal(init.method, "DELETE");
		return Response.json({ commit: { sha: "deleted" } });
	});
	await deletePost(env, path, "version-1");
});

test("invalid paths and malformed YAML never issue a GitHub request", async (t) => {
	const fetch = t.mock.method(globalThis, "fetch", async () => {
		throw new Error("must not fetch");
	});
	await assert.rejects(() => savePost(env, { path: "src/content/posts/../secret.md", content }), /文章路径/u);
	await assert.rejects(() => savePost(env, { path, content: "---\ntitle: [bad\n---\n" }), /YAML/u);
	assert.equal(fetch.mock.callCount(), 0);
});

test("GitHub failures explain recovery without disclosing upstream response data", async (t) => {
	t.mock.method(globalThis, "fetch", async () => new Response("github_pat_sensitive-value private-repository-details", { status: 409 }));
	await assert.rejects(() => githubFetch(env, "/repos/owner/blog"), (error: Error) => {
		assert.match(error.message, /409.*重新加载/u);
		assert.doesNotMatch(error.message, /sensitive|private-repository|github_pat/u);
		return true;
	});
});
