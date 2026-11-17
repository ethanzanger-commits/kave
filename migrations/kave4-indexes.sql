-- Query speed. Safe to run more than once.
create index if not exists swipe_to_idx on swipe ("toId");
create index if not exists match_a_idx on match (a);
create index if not exists match_b_idx on match (b);
create index if not exists user_created_idx on "user" ("createdAt");
create index if not exists message_match_idx on message ("matchId");
