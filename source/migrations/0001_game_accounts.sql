CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  best_score INTEGER NOT NULL DEFAULT 0 CHECK (best_score >= 0),
  gems INTEGER NOT NULL DEFAULT 0 CHECK (gems >= 0),
  merged_fruits INTEGER NOT NULL DEFAULT 0 CHECK (merged_fruits >= 0),
  equipped_skin TEXT NOT NULL DEFAULT 'classic',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE game_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  finished_at INTEGER,
  score INTEGER NOT NULL DEFAULT 0,
  merged_fruits INTEGER NOT NULL DEFAULT 0,
  earned_gems INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX game_runs_user_idx ON game_runs(user_id, created_at);
CREATE INDEX users_leaderboard_idx ON users(best_score DESC, created_at ASC, id ASC);

CREATE TABLE owned_skins (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skin TEXT NOT NULL,
  purchase_id TEXT NOT NULL UNIQUE,
  purchased_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, skin)
);
