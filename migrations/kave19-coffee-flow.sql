-- Coffee completion + private feedback. Two NEW tables only: no existing table or row is changed or deleted.
-- Safe to run more than once. Run in Neon SQL Editor BEFORE deploying the matching code.
create table if not exists coffee_confirmation (
  "matchId" text not null,
  "userId" text not null,
  outcome text not null check (outcome in ('met', 'not_met')),
  at timestamp default now(),
  primary key ("matchId", "userId")
);
create index if not exists coffee_confirmation_user_idx on coffee_confirmation ("userId");
-- PRIVATE: only the author may ever read a row (the app queries by "userId" = the signed-in user; admin sees aggregates only).
create table if not exists coffee_feedback (
  "matchId" text not null,
  "userId" text not null,
  again text check (again in ('yes', 'maybe', 'no')),
  rating integer check (rating between 1 and 5),
  note text,
  at timestamp default now(),
  primary key ("matchId", "userId")
);
