import { isMap, parseDocument as parseYamlDocument } from "yaml";

export const POSTS_ROOT = "src/content/posts/";

/** Plain data so a draft can retain its original YAML across browser reloads. */
export interface EditorFields {
	title: string;
	slug: string;
	folder: string;
	published: string;
	updated: string;
	description: string;
	image: string;
	category: string;
	tags: string;
	lang: string;
	author: string;
	sourceLink: string;
	licenseName: string;
	licenseUrl: string;
	password: string;
	passwordHint: string;
	draft: boolean;
	pinned: boolean;
	comment: boolean;
	weight: number;
	extension: "md" | "mdx";
	/** Original frontmatter, including keys not exposed in the editor. Never emit this key into YAML. */
	_frontmatterSource?: string;
	_lineEnding?: "\n" | "\r\n";
}

export interface ParsedDocument {
	fields: EditorFields;
	body: string;
	hasFrontmatter: boolean;
}

export function newEditorFields(): EditorFields {
	return {
		title: "", slug: "", folder: "posts1-Tutorial",
		published: new Date().toISOString().slice(0, 10), updated: "",
		description: "", image: "", category: "笔记", tags: "", lang: "zh-CN",
		author: "", sourceLink: "", licenseName: "", licenseUrl: "",
		password: "", passwordHint: "", draft: true, pinned: false, comment: true,
		weight: 0, extension: "md",
	};
}

function yamlDocument(source: string) {
	const document = parseYamlDocument(source, { uniqueKeys: true, prettyErrors: false });
	if (document.errors.length) {
		throw new Error(`文章 YAML 格式错误：${document.errors[0].message}`);
	}
	if (document.contents !== null && !isMap(document.contents)) {
		throw new Error("文章 Frontmatter 必须是 YAML 键值对象");
	}
	return document;
}

function text(value: unknown, fallback = ""): string {
	return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function bool(value: unknown, fallback = false): boolean {
	return value === undefined || value === null ? fallback : value === true || value === "true";
}

function formatTags(tags: unknown): string {
	if (!Array.isArray(tags)) return text(tags);
	const strings = tags.filter((tag): tag is string => typeof tag === "string");
	// A JSON array is accepted by the field too, preserving a tag that contains a comma.
	return strings.some((tag) => /[,，\n"]/u.test(tag)) ? JSON.stringify(strings) : strings.join(", ");
}

/** Accept the usual comma-separated input or a YAML/JSON array for tags containing commas. */
export function parseTags(value: string): string[] {
	const source = value.trim();
	if (!source) return [];
	if (source.startsWith("[")) {
		const document = parseYamlDocument(source, { prettyErrors: false });
		const data: unknown = document.errors.length ? null : document.toJS({ maxAliasCount: 100 });
		if (!Array.isArray(data) || data.some((tag) => typeof tag !== "string")) {
			throw new Error("标签数组必须只包含文字，例如 [\"Linux\", \"教程\"]");
		}
		return [...new Set(data.map((tag: string) => tag.trim()).filter(Boolean))];
	}
	return [...new Set(source.split(/[,，]/u).map((tag) => tag.trim()).filter(Boolean))];
}

function dataFields(data: Record<string, unknown>) {
	return {
		title: text(data.title), published: text(data.published), updated: text(data.updated),
		description: text(data.description), image: text(data.image), category: text(data.category),
		tags: formatTags(data.tags), lang: text(data.lang), author: text(data.author),
		sourceLink: text(data.sourceLink), licenseName: text(data.licenseName),
		licenseUrl: text(data.licenseUrl), password: text(data.password), passwordHint: text(data.passwordHint),
		draft: bool(data.draft), pinned: bool(data.pinned), comment: bool(data.comment, true),
		weight: typeof data.weight === "number" && Number.isFinite(data.weight) ? data.weight : 0,
	};
}

export function parseDocument(content: string, path: string): ParsedDocument {
	const normalized = validatePostPath(path);
	const fileName = normalized.split("/").at(-1)!;
	const fields: EditorFields = {
		...newEditorFields(),
		slug: fileName.replace(/\.(md|mdx)$/iu, ""),
		folder: normalized.slice(POSTS_ROOT.length).split("/").slice(0, -1).join("/"),
		extension: fileName.toLowerCase().endsWith(".mdx") ? "mdx" : "md",
	};
	// Only delimiters are located with a regular expression; YAML itself is parsed by the YAML library.
	const opening = content.match(/^\uFEFF?---[ \t]*\r?\n/u);
	if (!opening) return { fields, body: content, hasFrontmatter: false };
	const remaining = content.slice(opening[0].length);
	const closing = /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/mu.exec(remaining);
	if (!closing) throw new Error("文章 Frontmatter 缺少结束的 ---");
	const source = remaining.slice(0, closing.index);
	const document = yamlDocument(source);
	const data = (document.toJS({ maxAliasCount: 100 }) ?? {}) as Record<string, unknown>;
	Object.assign(fields, dataFields(data), {
		_frontmatterSource: source,
		_lineEnding: opening[0].endsWith("\r\n") ? "\r\n" : "\n",
	});
	return {
		fields,
		// Do not trim: leading spaces may be an indented Markdown code block.
		body: remaining.slice(closing.index + closing[0].length),
		hasFrontmatter: true,
	};
}

/** Reject ambiguous paths before either constructing a GitHub URL or writing a repository file. */
export function validatePostPath(path: string): string {
	const normalized = path.replaceAll("\\", "/");
	const segments = normalized.split("/");
	if (
		!normalized.startsWith(POSTS_ROOT) ||
		segments.some((segment) => !segment || segment === "." || segment === ".." || /[\u0000-\u001f\u007f]/u.test(segment)) ||
		!/\.(md|mdx)$/iu.test(normalized)
	) {
		throw new Error("文章路径必须位于 src/content/posts/，使用 .md 或 .mdx 扩展名，且不能包含空目录、. 或 ..");
	}
	return normalized;
}

export function currentPath(fields: EditorFields): string {
	const folder = fields.folder.trim().replaceAll("\\", "/");
	const slug = fields.slug.trim();
	if (!slug || /[/\\]/u.test(slug)) throw new Error("文件名不能为空，也不能包含 / 或 \\");
	if (fields.extension !== "md" && fields.extension !== "mdx") throw new Error("文章扩展名必须为 md 或 mdx");
	return validatePostPath(`${POSTS_ROOT}${folder ? `${folder}/` : ""}${slug}.${fields.extension}`);
}

export function buildDocument(fields: EditorFields, body: string): string {
	const existing = fields._frontmatterSource !== undefined;
	const document = yamlDocument(fields._frontmatterSource ?? "");
	const original = dataFields((document.toJS({ maxAliasCount: 100 }) ?? {}) as Record<string, unknown>);
	const values = {
		title: fields.title, published: fields.published, updated: fields.updated,
		image: fields.image, description: fields.description, tags: parseTags(fields.tags),
		category: fields.category, draft: fields.draft, pinned: fields.pinned, weight: Number(fields.weight) || 0,
		lang: fields.lang, author: fields.author, sourceLink: fields.sourceLink,
		licenseName: fields.licenseName, licenseUrl: fields.licenseUrl,
		comment: fields.comment, password: fields.password, passwordHint: fields.passwordHint,
	};
	let changed = !existing;
	for (const [key, value] of Object.entries(values)) {
		const originalValue = key === "tags" ? parseTags(original.tags) : original[key as keyof typeof original];
		if (existing && JSON.stringify(value) === JSON.stringify(originalValue)) continue;
		if (key === "updated" && !value) document.delete(key);
		else document.set(key, value);
		changed = true;
	}
	// Mutating the YAML AST retains unknown nested fields, comments and unchanged scalar styles.
	const newline = fields._lineEnding ?? "\n";
	const source = changed ? document.toString({ lineWidth: 0 }).replace(/\r?\n/gu, newline) : fields._frontmatterSource!;
	return `---${newline}${source.endsWith("\n") ? source : `${source}${newline}`}---${newline}${body}`;
}

/** Approximate reading length: one CJK character or one non-CJK word counts as a unit. */
export function countWords(body: string): number {
	const readable = body
		.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/gu, "")
		.replace(/<[^>]*>/gu, "")
		.replace(/!?\[([^\]]*)\]\([^)]*\)/gu, "$1")
		.replace(/https?:\/\/\S+/gu, "");
	const cjk = readable.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length ?? 0;
	const words = readable
		.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, " ")
		.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
	return cjk + words;
}
