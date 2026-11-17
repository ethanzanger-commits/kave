-- Saves half-finished profiles to the account so nothing is lost. Safe to run more than once.
create table if not exists profile_draft ("userId" text primary key, data jsonb not null, "updatedAt" timestamp default now());
