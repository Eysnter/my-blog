export interface D1Result<T = unknown> {
	success: boolean;
	results?: T[];
	meta?: Record<string, unknown>;
}

export interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
	run<T = unknown>(): Promise<D1Result<T>>;
	all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface R2ObjectBody {
	body: ReadableStream;
	httpEtag: string;
	writeHttpMetadata(headers: Headers): void;
}

export interface R2Bucket {
	put(
		key: string,
		value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
		options?: { httpMetadata?: { contentType?: string; cacheControl?: string }; customMetadata?: Record<string, string> },
	): Promise<unknown>;
	get(key: string): Promise<R2ObjectBody | null>;
	delete(key: string): Promise<void>;
}

export interface AssetFetcher {
	fetch(request: Request): Promise<Response>;
}

export interface Env {
	ASSETS: AssetFetcher;
	DB?: D1Database;
	MEDIA?: R2Bucket;
	PASSWORD_PEPPER?: string;
	ADMIN_SETUP_TOKEN?: string;
	GITHUB_TOKEN?: string;
	GITHUB_OWNER?: string;
	GITHUB_REPO?: string;
	GITHUB_BRANCH?: string;
	MEDIA_PUBLIC_BASE?: string;
	TURNSTILE_SECRET_KEY?: string;
}

export interface SessionUser {
	id: string;
	username: string;
	role: "owner" | "editor";
	csrfToken: string;
	sessionHash: string;
}
