import type { Env } from "./types";

export const RASTER_TYPES = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/gif", "gif"],
	["image/webp", "webp"],
]);

// Check the bytes as well as the client-supplied MIME type. SVG/HTML are
// deliberately excluded because these uploads are served from the blog origin.
export function matchesImageSignature(bytes: Uint8Array, type: string): boolean {
	const startsWith = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
	if (type === "image/png") return bytes.length >= 24 && startsWith(137, 80, 78, 71, 13, 10, 26, 10);
	if (type === "image/jpeg") return bytes.length >= 4 && startsWith(255, 216, 255);
	if (type === "image/gif") {
		const header = new TextDecoder("ascii").decode(bytes.subarray(0, 6));
		return bytes.length >= 13 && (header === "GIF87a" || header === "GIF89a");
	}
	if (type === "image/webp") {
		const ascii = new TextDecoder("ascii");
		return bytes.length >= 20 && ascii.decode(bytes.subarray(0, 4)) === "RIFF"
			&& ascii.decode(bytes.subarray(8, 12)) === "WEBP"
			&& ["VP8 ", "VP8L", "VP8X"].includes(ascii.decode(bytes.subarray(12, 16)));
	}
	return false;
}

export function publicMediaUrl(origin: string, key: string): string {
	return `${origin}/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function serveMedia(request: Request, env: Env): Promise<Response> {
	const unavailable = () => new Response("图片不存在", { status: 404, headers: { "Cache-Control": "no-store" } });
	if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
	if (!env.DB || !env.MEDIA) return unavailable();
	let key: string;
	try {
		key = decodeURIComponent(new URL(request.url).pathname.slice("/media/".length));
	} catch {
		return unavailable();
	}
	if (!key || key.length > 500 || /[\\\u0000-\u001f\u007f]/u.test(key)
		|| key.split("/").some((part) => !part || part === "." || part === "..")) return unavailable();
	const media = await env.DB.prepare("SELECT mime_type FROM media WHERE object_key = ?")
		.bind(key).first<{ mime_type: string }>();
	if (!media || !RASTER_TYPES.has(media.mime_type)) return unavailable();
	const object = await env.MEDIA.get(key);
	if (!object) return unavailable();
	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("Content-Type", media.mime_type);
	headers.set("X-Content-Type-Options", "nosniff");
	headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
	headers.set("Content-Disposition", "inline");
	headers.set("Cache-Control", "public, max-age=86400");
	headers.set("ETag", object.httpEtag);
	if (request.headers.get("If-None-Match")?.split(",").some((etag) => etag.trim() === object.httpEtag)) {
		return new Response(null, { status: 304, headers });
	}
	return new Response(request.method === "HEAD" ? null : object.body, { headers });
}
