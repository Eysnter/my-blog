import assert from "node:assert/strict";
import test from "node:test";
import { parseDocument as parseYamlDocument } from "yaml";
import {
	buildDocument,
	countWords,
	currentPath,
	newEditorFields,
	parseDocument,
	parseTags,
	validatePostPath,
} from "../shared/admin-content.ts";

const path = "src/content/posts/教程/中文 #1?.mdx";
const original = `---
# Keep this comment for future editors.
title: "标题: 包含冒号"
published: 2026-10-20
description: |
  第一行摘要
  第二行摘要
tags:
  - Linux
  - "设计, 实践"
category: 技术
draft: false
custom:
  nested:
    enabled: true
    colors: [pink, white]
  caption: >-
    自定义多行
    配置内容
---

    indented Markdown code

# 正文标题

Hello 世界
`;

test("a no-op round trip retains YAML comments, nested data, multiline fields and body whitespace", () => {
	const parsed = parseDocument(original, path);
	assert.equal(parsed.hasFrontmatter, true);
	assert.equal(parsed.fields.title, "标题: 包含冒号");
	assert.equal(parsed.fields.description, "第一行摘要\n第二行摘要\n");
	assert.deepEqual(parseTags(parsed.fields.tags), ["Linux", "设计, 实践"]);
	assert.equal(parsed.body.startsWith("\n    indented Markdown code"), true);
	assert.equal(buildDocument(parsed.fields, parsed.body), original);
	assert.equal(currentPath(parsed.fields), path);
});

test("editing exposed fields retains unexposed nested YAML, comments and exact Markdown bytes", () => {
	const parsed = parseDocument(original, path);
	const fields = JSON.parse(JSON.stringify(parsed.fields)); // D1 draft serialization and recovery.
	fields.title = "更新后的标题";
	fields.description = "新摘要第一行\n新摘要第二行\n";
	fields.pinned = true;
	fields.tags = '["Linux", "设计, 实践", "新标签"]';
	const result = buildDocument(fields, parsed.body);
	const restored = parseDocument(result, path);
	const yaml = parseYamlDocument(restored.fields._frontmatterSource!).toJS();
	assert.equal(restored.fields.title, fields.title);
	assert.equal(restored.fields.description, fields.description);
	assert.equal(restored.fields.pinned, true);
	assert.deepEqual(parseTags(restored.fields.tags), ["Linux", "设计, 实践", "新标签"]);
	assert.deepEqual(yaml.custom, {
		nested: { enabled: true, colors: ["pink", "white"] },
		caption: "自定义多行 配置内容",
	});
	assert.match(result, /# Keep this comment for future editors\./u);
	assert.equal(restored.body, parsed.body);
	assert.equal(yaml._frontmatterSource, undefined);
	assert.equal(yaml._lineEnding, undefined);
});

test("root-level articles stay root-level and Windows line endings preserve body indentation", () => {
	const content = "---\r\ntitle: Root article\r\npublished: 2026-10-20\r\n---\r\n \r\n    code\r\n";
	const parsed = parseDocument(content, "src/content/posts/root.md");
	assert.equal(parsed.fields.folder, "");
	assert.equal(currentPath(parsed.fields), "src/content/posts/root.md");
	assert.equal(buildDocument(parsed.fields, parsed.body), content);
	parsed.fields.title = "Edited";
	const rebuilt = buildDocument(parsed.fields, parsed.body);
	assert.equal(parseDocument(rebuilt, "src/content/posts/root.md").body, " \r\n    code\r\n");
	assert.equal(rebuilt.replaceAll("\r\n", "").includes("\n"), false);
});

test("new articles serialize punctuation, multiline text and real booleans as valid YAML", () => {
	const fields = newEditorFields();
	Object.assign(fields, {
		title: 'Linux: "入门"',
		slug: "a tutorial",
		folder: "",
		description: "line one\nline two",
		tags: "Linux，教程, Linux",
		draft: false,
		comment: false,
		weight: 7,
	});
	const content = buildDocument(fields, "\n正文\n");
	const parsed = parseDocument(content, currentPath(fields));
	const data = parseYamlDocument(parsed.fields._frontmatterSource!).toJS();
	assert.equal(data.title, fields.title);
	assert.equal(data.description, fields.description);
	assert.equal(data.draft, false);
	assert.equal(data.comment, false);
	assert.equal(data.weight, 7);
	assert.deepEqual(data.tags, ["Linux", "教程"]);
	assert.equal(data.updated, undefined);
	assert.equal(parsed.body, "\n正文\n");
});

test("malformed, duplicate or non-mapping frontmatter fails visibly rather than discarding it", () => {
	for (const source of [
		"---\ntitle: [broken\n---\ntext",
		"---\ntitle: A\ntitle: B\n---\ntext",
		"---\n- one\n- two\n---\ntext",
		"---\ntitle: Missing closing delimiter\n",
	]) {
		assert.throws(() => parseDocument(source, "src/content/posts/test.md"), /YAML|Frontmatter/u);
	}
});

test("paths reject traversal and ambiguous empty segments without silently renaming files", () => {
	const invalid = [
		"src/content/posts/../secret.md",
		"src/content/posts/./article.md",
		"src/content/posts//article.md",
		"/src/content/posts/article.md",
		"src/content/posts/article.md/",
		"src/content/posts/.git/config",
		"src/content/posts/a\u0000.md",
		"src/content/posts2/article.md",
	];
	for (const value of invalid) assert.throws(() => validatePostPath(value), /文章路径/u, value);
	assert.equal(validatePostPath(path), path);
	assert.equal(validatePostPath("src\\content\\posts\\中文.md"), "src/content/posts/中文.md");
	const fields = newEditorFields();
	fields.slug = "a/b";
	assert.throws(() => currentPath(fields), /文件名/u);
});

test("word count excludes fenced code and link URLs while counting Chinese and English text", () => {
	assert.equal(countWords("Hello 世界\n[教程](https://example.com/path)\n```js\nconst hidden = 10;\n```"), 5);
});

test("plain Markdown remains available for recovery and invalid tag arrays are rejected", () => {
	const content = "    leading code\n";
	const parsed = parseDocument(content, "src/content/posts/plain.md");
	assert.equal(parsed.hasFrontmatter, false);
	assert.equal(parsed.body, content);
	assert.throws(() => parseTags("[Linux, {bad: value}]"), /标签数组/u);
});
