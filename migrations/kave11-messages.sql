-- In-app messaging. Safe to run more than once.
create table if not exists dm_thread (
  id text primary key default gen_random_uuid()::text,
  a text not null, b text not null,            -- the two members, a < b
  initiator text not null,                     -- who sent the first message
  status text not null default 'pending',      -- pending, accepted or declined
  "at" timestamp default now(), "lastAt" timestamp default now(),
  unique (a, b), check (a < b)
);
create table if not exists dm_message (
  id text primary key default gen_random_uuid()::text,
  "threadId" text not null references dm_thread(id) on delete cascade,
  "senderId" text not null, body text not null,
  "at" timestamp default now(), "readAt" timestamp
);
create index if not exists dm_message_thread_idx on dm_message ("threadId", "at");
create index if not exists dm_thread_a_idx on dm_thread (a);
create index if not exists dm_thread_b_idx on dm_thread (b);
