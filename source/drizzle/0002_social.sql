CREATE TABLE garden_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  friend_code TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 100000,
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE garden_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES garden_accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX garden_sessions_account_idx ON garden_sessions(account_id);
--> statement-breakpoint
CREATE INDEX garden_sessions_expiry_idx ON garden_sessions(expires_at);
--> statement-breakpoint
CREATE TABLE garden_friends (
  account_low TEXT NOT NULL REFERENCES garden_accounts(id) ON DELETE CASCADE,
  account_high TEXT NOT NULL REFERENCES garden_accounts(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES garden_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (account_low, account_high),
  CHECK (account_low < account_high)
);
--> statement-breakpoint
CREATE INDEX garden_friends_high_idx ON garden_friends(account_high);
--> statement-breakpoint
CREATE TABLE garden_invites (
  token_hash TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES garden_accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX garden_invites_owner_idx ON garden_invites(owner_id);
--> statement-breakpoint
CREATE TABLE garden_rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_id TEXT NOT NULL REFERENCES garden_accounts(id) ON DELETE CASCADE,
  seed INTEGER NOT NULL,
  mode TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX garden_rooms_expiry_idx ON garden_rooms(expires_at);
--> statement-breakpoint
CREATE TABLE garden_room_players (
  room_id TEXT NOT NULL REFERENCES garden_rooms(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES garden_accounts(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  fruit_count INTEGER NOT NULL DEFAULT 0 CHECK (fruit_count >= 0),
  playing INTEGER NOT NULL DEFAULT 0 CHECK (playing IN (0, 1)),
  joined_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, account_id)
);
--> statement-breakpoint
CREATE INDEX garden_room_players_account_idx ON garden_room_players(account_id);
--> statement-breakpoint
CREATE TABLE garden_login_limits (
  key_hash TEXT PRIMARY KEY,
  window_started INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX garden_login_limits_window_idx ON garden_login_limits(window_started);
--> statement-breakpoint
