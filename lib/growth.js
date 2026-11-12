// Growth reporting. Every number comes from real rows (users, profiles, swipes, matches) through the complete_member and member_activity views.
const IL = "Asia/Jerusalem";
export const weekly = (q) => q`
  with w as (select date_trunc('week', now() at time zone 'Asia/Jerusalem') - (n || ' weeks')::interval as w0 from generate_series(0, 7) n)
  select to_char(w0, 'DD Mon') as label, w0,
    (select count(*) from "user" u where u.id not like 'demo-%' and date_trunc('week', (u."createdAt" at time zone 'UTC') at time zone 'Asia/Jerusalem') = w0)::int as regs,
    (select count(*) from complete_member c where date_trunc('week', (c."completedAt" at time zone 'UTC') at time zone 'Asia/Jerusalem') = w0)::int as completed,
    (select count(*) from member_activity a where date_trunc('week', (least(a.first_ask, a.first_match) at time zone 'UTC') at time zone 'Asia/Jerusalem') = w0)::int as activated,
    (select count(*) from swipe s where s.yes and s."fromId" not like 'demo-%' and date_trunc('week', (s.at at time zone 'UTC') at time zone 'Asia/Jerusalem') = w0)::int as asks,
    (select count(*) from match m where m.a not like 'demo-%' and m.b not like 'demo-%' and date_trunc('week', (m.at at time zone 'UTC') at time zone 'Asia/Jerusalem') = w0)::int as accepted,
    (select count(*) from match m where m.a not like 'demo-%' and m.b not like 'demo-%' and (m.status = 'confirmed' or (m.status is null and m."whenText" is not null)) and m."whenText" ~ '^\\d{4}-\\d{2}-\\d{2}T' and date_trunc('week', m."whenText"::timestamp) = w0)::int as confirmed,
    (select count(*) from complete_member c where date_trunc('week', (c."createdAt" at time zone 'UTC') at time zone 'Asia/Jerusalem') = w0)::int as cohort_completed,
    (select count(*) from member_activity a join complete_member c on c.id = a.id where date_trunc('week', (c."createdAt" at time zone 'UTC') at time zone 'Asia/Jerusalem') = w0 and (a.first_ask is not null or a.first_match is not null))::int as cohort_activated,
    (select count(*) from member_activity a join complete_member c on c.id = a.id where date_trunc('week', (c."createdAt" at time zone 'UTC') at time zone 'Asia/Jerusalem') = w0 and a.confirmed > 0)::int as cohort_confirmed
  from w order by w0 desc`;
export const channels = (q) => q`
  select coalesce(u.source, 'unknown') as source, count(*)::int as registered, count(c.id)::int as completed,
    (count(a.id) filter (where a.first_ask is not null or a.first_match is not null))::int as activated,
    (count(a.id) filter (where a.confirmed > 0))::int as confirmed
  from "user" u left join complete_member c on c.id = u.id left join member_activity a on a.id = u.id
  where u.id not like 'demo-%' group by 1 order by registered desc`;
export const clicksBySource = (q) => q`select case when name = 'ref_visit' then 'referral' else substr(name, 7) end as source, count(*)::int as clicks from event where name like 'visit:%' or name = 'ref_visit' group by 1`;
export const referrers = (q) => q`
  select r.id, r.name, r.email, (select count(*) from event e where e."userId" = r.id and e.name = 'ref_visit')::int as clicks,
    count(u.id)::int as registered, count(c.id)::int as completed,
    (count(a.id) filter (where a.first_ask is not null or a.first_match is not null))::int as activated
  from "user" r join "user" u on u."referredBy" = r.id left join complete_member c on c.id = u.id left join member_activity a on a.id = u.id
  where r.id not like 'demo-%' group by r.id, r.name, r.email order by completed desc, registered desc limit 10`;
export const activeUsers = async (q) => (await q`select (count(*) filter (where last_active > now() - interval '7 days'))::int as wau, (count(*) filter (where last_active > now() - interval '30 days'))::int as mau, count(*)::int as members from member_activity`)[0];
export const inactive = (q, days = 14) => q`select a.id, c.name, c.email, c.source, a.last_active, floor(extract(epoch from (now() - a.last_active)) / 86400)::int as days from member_activity a join complete_member c on c.id = a.id where a.last_active < now() - make_interval(days => ${days}) order by a.last_active limit 100`;
export const stalled = (q) => q`select a.id, c.name, c.email, c.source, floor(extract(epoch from (now() - c."completedAt")) / 86400)::int as days from member_activity a join complete_member c on c.id = a.id where a.first_ask is null and a.first_match is null and c."completedAt" < now() - interval '3 days' order by c."completedAt" limit 100`;
export const incomplete = (q) => q`select u.id, u.name, u.email, u.source, u.image, p.headline, p.about, p.city, p.skills, p."ageOk", floor(extract(epoch from (now() - u."createdAt")) / 86400)::int as days, (select count(*) from reminder r where r."userId" = u.id and r.status = 'sent')::int as reminders from "user" u left join profile p on p."userId" = u.id where u.id not like 'demo-%' and u.id not in (select id from complete_member) order by u."createdAt" desc limit 200`;
export const experimentStats = async (q, channel, from, to) => (await q`select count(*)::int as registered, count(c.id)::int as completed, (count(a.id) filter (where a.first_ask is not null or a.first_match is not null))::int as activated from "user" u left join complete_member c on c.id = u.id left join member_activity a on a.id = u.id where u.source = ${channel} and u."createdAt" >= coalesce(${from}::date, '2000-01-01'::date) and u."createdAt" < coalesce(${to}::date, '2100-01-01'::date) + 1`)[0];
