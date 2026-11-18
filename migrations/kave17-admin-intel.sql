-- Admin Intelligence: lets the existing event table record WHICH match an event belongs to.
-- Adds 3 nullable columns + indexes only. No data is changed or deleted. Safe to run more than once.
alter table event add column if not exists "matchId" text, add column if not exists meta jsonb, add column if not exists key text;
create unique index if not exists event_key_uq on event (key) where key is not null;
create index if not exists event_name_at_idx on event (name, at);
create index if not exists event_match_idx on event ("matchId") where "matchId" is not null;
