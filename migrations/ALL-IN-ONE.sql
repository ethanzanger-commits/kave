-- KAVE: ALL MIGRATIONS IN ONE PASTE (kave2 to kave18). Safe to run more than once, in any state: every statement is idempotent.
-- Paste the whole file into the Neon SQL Editor and run. Nothing is deleted. If a NOTICE about duplicate matches appears, see kave18 notes inside.

-- ===== kave2 =====
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

-- ===== kave3-cities =====
-- Move everyone to preset cities and remove neighborhood detail. Safe to run more than once.
update profile p set city = x.c, neighborhood = x.c from (
  select "userId", case
    when c0 = 'Other in Israel' then 'Other in Israel'
    when s like '%jerusalem%' then 'Jerusalem'
    when s like '%tel aviv%' or s like '%yafo%' or s like '%jaffa%' then 'Tel Aviv-Yafo'
    when s like '%haifa%' then 'Haifa'
    when s like '%beer sheva%' or s like '%beersheba%' or s like '%be''er sheva%' then 'Beer Sheva'
    when s like '%rishon%' then 'Rishon LeZion'
    when s like '%petah tikva%' or s like '%petach tikva%' or s like '%petah tiqva%' then 'Petah Tikva'
    when s like '%netanya%' then 'Netanya'
    when s like '%ashdod%' then 'Ashdod'
    when s like '%ramat gan%' then 'Ramat Gan'
    when s like '%herzliya%' or s like '%herzlia%' then 'Herzliya'
    when s like '%ra''anana%' or s like '%raanana%' then 'Ra''anana'
    when s like '%kfar saba%' or s like '%kfar sava%' then 'Kfar Saba'
    when s like '%modi''in%' or s like '%modiin%' then 'Modi''in'
    when s like '%beit shemesh%' then 'Beit Shemesh'
    when s like '%rehovot%' then 'Rehovot'
    when s like '%holon%' then 'Holon'
    when s like '%bat yam%' then 'Bat Yam'
    when s like '%hod hasharon%' then 'Hod HaSharon'
    when s like '%givatayim%' then 'Givatayim'
    when s like '%nazareth%' then 'Nazareth'
    when s like '%tiberias%' then 'Tiberias'
    when s like '%eilat%' then 'Eilat'
    else null end as c
  from (select "userId", city as c0, lower(coalesce(city, '') || ' ' || coalesce(neighborhood, '')) as s from profile) y
) x where p."userId" = x."userId";

-- ===== kave4-indexes =====
-- Query speed. Safe to run more than once.
create index if not exists swipe_to_idx on swipe ("toId");
create index if not exists match_a_idx on match (a);
create index if not exists match_b_idx on match (b);
create index if not exists user_created_idx on "user" ("createdAt");
create index if not exists message_match_idx on message ("matchId");

-- ===== kave5-leaderboards =====
-- Who's new + monthly leaderboards. Safe to run more than once.
alter table profile add column if not exists "completedAt" timestamp;
update profile set "completedAt" = "updatedAt" where "ageOk" and "completedAt" is null;
create table if not exists monthly_winner (month text not null, category text not null, "userId" text not null, count int not null, at timestamp default now(), primary key (month, category));
create index if not exists profile_completed_idx on profile ("completedAt");

-- ===== kave6-prompts =====
-- "What I'm working on" prompt. Safe to run more than once.
alter table profile add column if not exists "workingOn" text;

-- ===== kave7-community =====
-- Homepage opt-in, public thank-yous, saved members, circles, phone notifications. Safe to run more than once.
alter table profile add column if not exists "showOnHome" boolean default false;
alter table thanks add column if not exists "isPublic" boolean default false, add column if not exists hidden boolean default false;
create table if not exists saved ("userId" text not null, "targetId" text not null, at timestamp default now(), primary key ("userId", "targetId"));
create table if not exists circle (slug text primary key, name text not null, blurb text, at timestamp default now());
create table if not exists circle_member ("circleSlug" text not null, "userId" text not null, at timestamp default now(), primary key ("circleSlug", "userId"));
create table if not exists push_sub (endpoint text primary key, "userId" text not null, p256dh text not null, auth text not null, at timestamp default now());
create index if not exists push_sub_user_idx on push_sub ("userId");
create index if not exists circle_member_user_idx on circle_member ("userId");

-- ===== kave8-growth =====
-- Growth tracking: acquisition source, referral attribution at sign-up, experiment log, and reporting views. Safe to run more than once.
alter table "user" add column if not exists source text, add column if not exists "referredBy" text;
create table if not exists signup_attr ("userId" text primary key, source text, ref text, "referrerId" text, at timestamp default now());
create table if not exists intent (email text primary key, source text, ref text, at timestamp default now());
create index if not exists signup_attr_referrer_idx on signup_attr ("referrerId");
create index if not exists user_source_idx on "user" (source);
create table if not exists experiment (id text primary key default gen_random_uuid()::text, name text not null, hypothesis text, channel text, "startsOn" date, "endsOn" date, metric text, result text, learnings text, status text not null default 'running', at timestamp default now());
-- Existing referred members: credit the referrer at sign-up level too.
update "user" u set "referredBy" = p."invitedBy", source = coalesce(u.source, 'referral') from profile p where p."userId" = u.id and p."invitedBy" is not null and u."referredBy" is null;
-- A completed member: every required field filled, real (non-demo) account.
create or replace view complete_member as
select u.id, u.name, u.email, u.source, u."referredBy", u."createdAt", p."completedAt", p."invitedBy", p.city, p.headline
from "user" u join profile p on p."userId" = u.id
where p."ageOk" and not coalesce(p."isDemo", false) and u.id not like 'demo-%' and coalesce(p.about, '') <> '' and coalesce(p.headline, '') <> '' and coalesce(p.city, '') <> '' and u.image is not null and jsonb_array_length(coalesce(p.skills, '[]'::jsonb)) > 0;
-- Activation and activity for completed members, from real rows (swipes, matches, messages), not event counts.
create or replace view member_activity as
select c.id,
  (select min(s.at) from swipe s where s."fromId" = c.id and s.yes) as first_ask,
  (select min(m.at) from match m where m.a = c.id or m.b = c.id) as first_match,
  (select count(*) from match m where (m.a = c.id or m.b = c.id) and (m.status = 'confirmed' or (m.status is null and m."whenText" is not null)))::int as confirmed,
  (select count(*) from match m where (m.a = c.id or m.b = c.id) and m.met)::int as met_count,
  greatest(c."createdAt", (select max(s.at) from swipe s where s."fromId" = c.id), (select max(mm.at) from message mm where mm."fromId" = c.id), (select max(m.at) from match m where m.a = c.id or m.b = c.id), (select max(e.at) from event e where e."userId" = c.id and e.name <> 'ref_visit')) as last_active
from complete_member c;

-- ===== kave9-linkedin =====
-- Safe to run more than once. Probably already exists; this just makes sure.
alter table profile add column if not exists "linkedinUrl" text;

-- ===== kave10-scale =====
-- Faster People, search and Insights queries as the member count grows. Safe to run more than once.
create index if not exists profile_agecheck_idx on profile ("ageOk") where "ageOk";
create index if not exists profile_city_idx on profile (city);
create index if not exists swipe_from_idx on swipe ("fromId");
create index if not exists event_name_at_idx on event (name, at);
create index if not exists match_at_idx on match (at);
create index if not exists block_to_idx on block ("toId");

-- ===== kave11-messages =====
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

-- ===== kave12-scale =====
-- Rate limiting and the daily email budget. Safe to run more than once.
create table if not exists rate_hit (key text not null, "at" timestamp not null default now());
create index if not exists rate_hit_key_at_idx on rate_hit (key, "at");

-- ===== kave13-stories-broadcast =====
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

-- ===== kave14-finished-definition =====
-- One definition of a finished profile, used everywhere: photo, city, headline, about me, at least one skill, 18+ box, real (non-demo) account.
-- Same as the view from kave8-growth.sql. Safe to run more than once.
create or replace view complete_member as
select u.id, u.name, u.email, u.source, u."referredBy", u."createdAt", p."completedAt", p."invitedBy", p.city, p.headline
from "user" u join profile p on p."userId" = u.id
where p."ageOk" and not coalesce(p."isDemo", false) and u.id not like 'demo-%' and coalesce(p.about, '') <> '' and coalesce(p.headline, '') <> '' and coalesce(p.city, '') <> '' and u.image is not null and jsonb_array_length(coalesce(p.skills, '[]'::jsonb)) > 0;

-- ===== kave15-notices =====
-- In-app notices, such as "Dana joined through your invite". Safe to run more than once.
create table if not exists notice (
  id text primary key default gen_random_uuid()::text,
  "userId" text not null, text text not null, link text,
  "readAt" timestamp, "at" timestamp default now()
);
create index if not exists notice_user_unread_idx on notice ("userId") where "readAt" is null;

-- ===== kave16-draft =====
-- Saves half-finished profiles to the account so nothing is lost. Safe to run more than once.
create table if not exists profile_draft ("userId" text primary key, data jsonb not null, "updatedAt" timestamp default now());

-- ===== kave17-admin-intel =====
-- Admin Intelligence: lets the existing event table record WHICH match an event belongs to.
-- Adds 3 nullable columns + indexes only. No data is changed or deleted. Safe to run more than once.
alter table event add column if not exists "matchId" text, add column if not exists meta jsonb, add column if not exists key text;
create unique index if not exists event_key_uq on event (key) where key is not null;
create index if not exists event_name_at_idx on event (name, at);
create index if not exists event_match_idx on event ("matchId") where "matchId" is not null;

-- ===== kave18-unique-match =====
-- Stops two simultaneous "yes" swipes from creating two matches for the same pair. Safe to run more than once.
-- STEP 1 (read-only): if this returns rows, the pair already has duplicate matches and step 2 will skip itself:
--   select least(a,b) as p1, greatest(a,b) as p2, count(*) from match group by 1,2 having count(*) > 1;
-- STEP 2: creates the index only when there are no duplicates. Nothing is deleted or changed.
do $$ begin
  create unique index if not exists match_pair_uq on match (least(a, b), greatest(a, b));
exception when unique_violation then
  raise notice 'Duplicate matches exist, so the unique index was NOT created. Run the step 1 query, merge the duplicates, then run this script again.';
end $$;
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
-- Optional mutual WhatsApp connect. Two NEW tables only; nothing existing is changed.
-- Numbers live ONLY here (never in profile) and are readable only through lib/whatsapp.js after BOTH people consent.
-- Safe to run more than once. Run before deploying the matching code.
create table if not exists member_phone (
  "userId" text primary key,
  phone text not null,
  "updatedAt" timestamp default now()
);
create table if not exists whatsapp_consent (
  "matchId" text not null,
  "userId" text not null,
  status text not null check (status in ('shared', 'withdrawn')),
  at timestamp default now(),
  primary key ("matchId", "userId")
);
