PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	username TEXT NOT NULL UNIQUE COLLATE NOCASE,
	password_hash TEXT NOT NULL,
	password_salt TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor')),
	status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
	created_at INTEGER NOT NULL,
	last_login_at INTEGER,
	password_changed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
	token_hash TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	csrf_token TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	expires_at INTEGER NOT NULL,
	ip_hash TEXT,
	user_agent TEXT,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS drafts (
	id TEXT PRIMARY KEY,
	path TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL DEFAULT '',
	frontmatter_json TEXT NOT NULL DEFAULT '{}',
	markdown TEXT NOT NULL DEFAULT '',
	base_github_sha TEXT,
	status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'publishing', 'failed')),
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	updated_by TEXT NOT NULL,
	FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_drafts_updated ON drafts(updated_at DESC);

CREATE TABLE IF NOT EXISTS media (
	id TEXT PRIMARY KEY,
	object_key TEXT NOT NULL UNIQUE,
	url TEXT NOT NULL,
	file_name TEXT NOT NULL,
	mime_type TEXT NOT NULL,
	file_size INTEGER NOT NULL,
	width INTEGER,
	height INTEGER,
	alt TEXT NOT NULL DEFAULT '',
	sha256 TEXT,
	created_at INTEGER NOT NULL,
	created_by TEXT NOT NULL,
	FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id TEXT,
	action TEXT NOT NULL,
	target_type TEXT NOT NULL,
	target_id TEXT,
	detail_json TEXT NOT NULL DEFAULT '{}',
	created_at INTEGER NOT NULL,
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS login_attempts (
	identifier_hash TEXT PRIMARY KEY,
	attempts INTEGER NOT NULL DEFAULT 0,
	window_started_at INTEGER NOT NULL,
	locked_until INTEGER
);
