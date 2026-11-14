CREATE TABLE garden_signup_rewards (
  account_id TEXT PRIMARY KEY REFERENCES garden_accounts(id) ON DELETE CASCADE,
  receipt_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL CHECK(amount = 500),
  created_at INTEGER NOT NULL
);
