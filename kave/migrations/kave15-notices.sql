-- In-app notices, such as "Dana joined through your invite". Safe to run more than once.
create table if not exists notice (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null, text text not null, link text,
  "readAt" timestamp, "at" timestamp default now()
);
create index if not exists notice_user_unread_idx on notice ("userId") where "readAt" is null;
