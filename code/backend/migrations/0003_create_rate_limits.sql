CREATE TABLE rate_limits (
  key TEXT NOT NULL PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TEXT NOT NULL DEFAULT (datetime('now'))
);
