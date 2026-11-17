-- Kave 2.0 migration. Safe to run more than once.
alter table profile add column if not exists "foundingNo" integer, add column if not exists availability jsonb, add column if not exists city text;
create unique index if not exists profile_founding_no on profile ("foundingNo") where "foundingNo" is not null;
do $$ begin alter table profile add constraint founding_range check ("foundingNo" is null or "foundingNo" between 1 and 50); exception when duplicate_object then null; end $$;
create table if not exists reminder (id text primary key default gen_random_uuid()::text, "userId" text not null, step int not null, status text not null default 'queued', "sentAt" timestamp, "clickedAt" timestamp, error text, unique ("userId", step));
create table if not exists setting (key text primary key, value text);
create table if not exists optout (email text primary key, at timestamp default now());
create index if not exists event_user_idx on event ("userId", at);
create index if not exists profile_invited_idx on profile ("invitedBy");
-- Give Founding 50 numbers to already-complete profiles, in the order they were saved (first 50 only).
with o as (select p."userId", row_number() over (order by p."updatedAt", p."userId") rn from profile p join "user" u on u.id = p."userId" where p."ageOk" and not coalesce(p."isDemo", false) and p."userId" not like 'demo-%' and coalesce(p.about, '') <> '' and coalesce(p.headline, '') <> '' and coalesce(p.neighborhood, '') <> '' and u.image is not null and jsonb_array_length(coalesce(p.skills, '[]'::jsonb)) > 0 and p."foundingNo" is null)
update profile p set "foundingNo" = (select coalesce(max("foundingNo"), 0) from profile) + o.rn from o where p."userId" = o."userId" and (select coalesce(max("foundingNo"), 0) from profile) + o.rn <= 50;
