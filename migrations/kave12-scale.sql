-- Rate limiting and the daily email budget. Safe to run more than once.
create table if not exists rate_hit (key text not null, "at" timestamp not null default now());
create index if not exists rate_hit_key_at_idx on rate_hit (key, "at");
