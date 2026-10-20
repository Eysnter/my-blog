import type { Env } from "./types";

const encoder = new TextEncoder();

export function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function randomToken(size = 32): string {
	const bytes = new Uint8Array(size);
	crypto.getRandomValues(bytes);
	return bytesToBase64Url(bytes);
}

export async function sha256(value: string | ArrayBuffer): Promise<string> {
	const input = typeof value === "string" ? encoder.encode(value) : value;
	return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", input)));
}

export async function derivePassword(password: string, salt: string, env: Env): Promise<string> {
	const peppered = `${password}\u0000${env.PASSWORD_PEPPER ?? ""}`;
	const key = await crypto.subtle.importKey("raw", encoder.encode(peppered), "PBKDF2", false, ["deriveBits"]);
	const bits = await crypto.subtle.deriveBits(
		// Cloudflare Workers Web Crypto currently caps PBKDF2 at 100,000 iterations.
		// A server-side pepper and a unique random salt are still applied per password.
		{ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 100_000 },
		key,
		256,
	);
	return bytesToBase64Url(new Uint8Array(bits));
}

export function timingSafeEqual(left: string, right: string): boolean {
	const max = Math.max(left.length, right.length);
	let difference = left.length ^ right.length;
	for (let index = 0; index < max; index += 1) {
		difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
	}
	return difference === 0;
}

export function parseCookies(request: Request): Record<string, string> {
	const result: Record<string, string> = {};
	for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
		const separator = part.indexOf("=");
		if (separator < 0) continue;
		const name = part.slice(0, separator).trim();
		const value = part.slice(separator + 1).trim();
		if (name) result[name] = decodeURIComponent(value);
	}
	return result;
}

export function sessionCookie(token: string, maxAgeSeconds = 60 * 60 * 24 * 7): string {
	return [
		`firefly_admin_session=${encodeURIComponent(token)}`,
		"Path=/",
		"HttpOnly",
		"Secure",
		"SameSite=Strict",
		`Max-Age=${maxAgeSeconds}`,
	].join("; ");
}

export function clearSessionCookie(): string {
	return "firefly_admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}
