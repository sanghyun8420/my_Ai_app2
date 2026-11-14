CREATE TABLE garden_guest_keys (
  key_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES garden_accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE garden_cloud_saves (
  account_id TEXT PRIMARY KEY REFERENCES garden_accounts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK(version > 0),
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
