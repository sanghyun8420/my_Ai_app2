CREATE TABLE IF NOT EXISTS garden_game_scores (
  account_id TEXT NOT NULL REFERENCES garden_accounts(id) ON DELETE CASCADE,
  game TEXT NOT NULL CHECK(game IN ('suika','apple','blocks')),
  best_score INTEGER NOT NULL DEFAULT 0 CHECK(best_score>=0),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(account_id,game)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS garden_game_scores_rank ON garden_game_scores(game,best_score DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS garden_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id TEXT NOT NULL REFERENCES garden_accounts(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES garden_accounts(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 500),
  room_code TEXT,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS garden_messages_pair ON garden_messages(sender_id,receiver_id,id);
--> statement-breakpoint
ALTER TABLE garden_rooms ADD COLUMN game TEXT NOT NULL DEFAULT 'suika';
