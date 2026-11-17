-- Member stories and one-click broadcast emails. Safe to run more than once.
create table if not exists story (
  id text primary key default gen_random_uuid()::text,
  "userId" text, name text not null, body text not null,
  consent boolean not null default false,
  status text not null default 'pending',   -- pending, approved or hidden
  source text not null default 'member',    -- member or admin
  "at" timestamp default now()
);
create table if not exists broadcast (
  id text primary key default gen_random_uuid()::text,
  subject text not null, body text not null, stories boolean not null default true, "at" timestamp default now()
);
create table if not exists broadcast_sent (
  broadcast_id text not null references broadcast(id) on delete cascade,
  "userId" text not null, "at" timestamp default now(),
  primary key (broadcast_id, "userId")
);
create table if not exists optout (email text primary key);
