-- Growth tracking: acquisition source, referral attribution at sign-up, experiment log, and reporting views. Safe to run more than once.
alter table "user" add column if not exists source text, add column if not exists "referredBy" text;
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
