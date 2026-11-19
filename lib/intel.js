import { client } from "@/db";
// Tagged SQL: Raw fragments are inlined (trusted constants only); every other value becomes a bound parameter.
class Raw { constructor(s) { this.s = s; } }
const raw = (s) => new Raw(s);
const q = (strings, ...vals) => { let text = strings[0]; const params = []; vals.forEach((v, i) => { if (v instanceof Raw) text += v.s; else { params.push(v); text += "$" + params.length; } text += strings[i + 1]; }); return client(text, params); };
// Admin Intelligence queries. Real users only (no demo-*). Unknown history is returned as null, never 0.
const D = /^\d{4}-\d{2}-\d{2}$/;
export function parseFilters(sp) {
  const g = (k) => { const v = (sp.get ? sp.get(k) : sp[k]); return v ? String(v).trim().slice(0, 80) : null; };
  const d = (k) => { const v = g(k); return v && D.test(v) ? v : null; };
  const st = g("state"), cp = g("complete");
  return { from: d("from"), to: d("to"), city: g("city"), industry: g("industry"), source: g("source"), q: g("q"), state: ["completed", "not_met", "proposed_unconfirmed", "confirmed", "no_plan_yet"].includes(st) ? st : null, complete: cp === "yes" || cp === "no" ? cp : null };
}
export const NOFILTER = { from: null, to: null, city: null, industry: null, source: null, q: null, state: null, complete: null };
const STATE = raw(`case when m.met is true then 'completed' when m.met is false then 'not_met' when m.status = 'proposed' then 'proposed_unconfirmed' when m.status = 'confirmed' or (m.status is null and m."whenText" is not null) then 'confirmed' else 'no_plan_yet' end`);
export const COFFEE_EVENTS = ["coffee_proposed", "coffee_rescheduled", "coffee_confirmed", "coffee_cancelled", "coffee_completed", "coffee_not_completed", "coffee_participant_confirmed", "coffee_feedback_submitted", "match_removed"];
export async function trackedSince() {
  try { const [r] = await q`select min(at) as t from event where "matchId" is not null and name = any(${COFFEE_EVENTS})`; return r?.t || null; } catch { return null; }
}
// ---- Users ----
export const USER_COLS = ["user_id", "name", "email", "registered_at", "profile_completed_at", "profile_complete", "city", "industry", "headline", "company", "experience_entries", "seniority", "languages", "looking_for", "can_help", "acquisition_source", "referred_by_user_id", "invited_by_user_id", "last_activity_at"];
export async function users(f, limit = 100000) {
  const like = f.q ? "%" + f.q.replace(/[%_]/g, "") + "%" : null;
  return q`select u.id as user_id, u.name, u.email, u."createdAt" as registered_at, p."completedAt" as profile_completed_at, (c.id is not null) as profile_complete,
    p.city, p.industry, p.headline, p.company, case when jsonb_typeof(p.experience) = 'array' then jsonb_array_length(p.experience) end as experience_entries,
    'unavailable' as seniority, 'unavailable' as languages, p."lookingFor" as looking_for, p."canHelp" as can_help,
    coalesce(u.source, 'direct') as acquisition_source, u."referredBy" as referred_by_user_id, p."invitedBy" as invited_by_user_id,
    greatest(u."createdAt", (select max(s.at) from swipe s where s."fromId" = u.id), (select max(mm.at) from message mm where mm."fromId" = u.id), (select max(m.at) from match m where m.a = u.id or m.b = u.id), (select max(e.at) from event e where e."userId" = u.id and e.name <> 'ref_visit')) as last_activity_at
    from "user" u left join profile p on p."userId" = u.id left join complete_member c on c.id = u.id
    where u.id not like 'demo-%'
      and (${f.from}::date is null or u."createdAt" >= ${f.from}::date) and (${f.to}::date is null or u."createdAt" < ${f.to}::date + 1)
      and (${f.city}::text is null or p.city = ${f.city}) and (${f.industry}::text is null or p.industry = ${f.industry}) and (${f.source}::text is null or coalesce(u.source, 'direct') = ${f.source})
      and (${f.complete}::text is null or (c.id is not null) = (${f.complete} = 'yes'))
      and (${like}::text is null or u.name ilike ${like} or u.email ilike ${like})
    order by u."createdAt" desc limit ${limit}`;
}
// ---- Matches ----
export const MATCH_COLS = ["match_id", "created_at", "person_a_id", "person_b_id", "person_a_name", "person_b_name", "city_a", "city_b", "coffee_state", "match_status_raw", "proposed_by_user_id", "when_text", "place", "coffee_happened", "thank_yous", "chat_messages", "first_proposed_at", "confirmed_at", "completed_at", "cancellations", "reschedules", "hours_match_to_first_proposal", "hours_proposal_to_confirmation", "hours_proposal_to_completion"];
export async function matches(f, limit = 100000) {
  const ts = await trackedSince();
  return q`select m.id as match_id, m.at as created_at, m.a as person_a_id, m.b as person_b_id, ua.name as person_a_name, ub.name as person_b_name, pa.city as city_a, pb.city as city_b,
    ${STATE} as coffee_state, m.status as match_status_raw, m."proposedBy" as proposed_by_user_id, m."whenText" as when_text, m.place, m.met as coffee_happened,
    (select count(*)::int from thanks t where t."matchId" = m.id) as thank_yous, (select count(*)::int from message x where x."matchId" = m.id) as chat_messages,
    ev.first_proposed as first_proposed_at, ev.confirmed as confirmed_at, ev.completed as completed_at,
    case when ev.n > 0 or (${ts}::timestamp is not null and m.at >= ${ts}::timestamp) then coalesce(ev.cancels, 0) end as cancellations,
    case when ev.n > 0 or (${ts}::timestamp is not null and m.at >= ${ts}::timestamp) then coalesce(ev.resched, 0) end as reschedules,
    round((extract(epoch from (ev.first_proposed - m.at)) / 3600)::numeric, 1) as hours_match_to_first_proposal,
    round((extract(epoch from (ev.confirmed - ev.first_proposed)) / 3600)::numeric, 1) as hours_proposal_to_confirmation,
    round((extract(epoch from (ev.completed - ev.first_proposed)) / 3600)::numeric, 1) as hours_proposal_to_completion
    from match m left join "user" ua on ua.id = m.a left join "user" ub on ub.id = m.b left join profile pa on pa."userId" = m.a left join profile pb on pb."userId" = m.b
    left join lateral (select count(*)::int as n, min(at) filter (where name = 'coffee_proposed') as first_proposed, min(at) filter (where name = 'coffee_confirmed') as confirmed, min(at) filter (where name = 'coffee_completed') as completed,
      count(*) filter (where name = 'coffee_cancelled')::int as cancels, count(*) filter (where name = 'coffee_rescheduled')::int as resched from event e where e."matchId" = m.id) ev on true
    where m.a not like 'demo-%' and m.b not like 'demo-%'
      and (${f.from}::date is null or m.at >= ${f.from}::date) and (${f.to}::date is null or m.at < ${f.to}::date + 1)
      and (${f.city}::text is null or pa.city = ${f.city} or pb.city = ${f.city})
      and (${f.state}::text is null or ${STATE} = ${f.state})
    order by m.at desc limit ${limit}`;
}
// ---- Coffee activity: tracked events (real timestamps) + current-state snapshots of older matches (timestamp unknown, labelled) ----
export const COFFEE_COLS = ["record_type", "match_id", "user_id", "event_type", "event_at", "when_text", "place", "detail"];
export async function coffeeActivity(f) {
  return q`select * from (
    select 'tracked_event' as record_type, e."matchId" as match_id, e."userId" as user_id, e.name as event_type, e.at as event_at, e.meta->>'when' as when_text, e.meta->>'place' as place, e.meta::text as detail
      from event e where e."matchId" is not null and e.name = any(${COFFEE_EVENTS}) and e."userId" not like 'demo-%'
        and (${f.from}::date is null or e.at >= ${f.from}::date) and (${f.to}::date is null or e.at < ${f.to}::date + 1)
    union all
    select 'current_state_snapshot', m.id, null, 'state_' || (${STATE}), null, m."whenText", m.place, 'timestamp not recorded; state as of export'
      from match m where m.a not like 'demo-%' and m.b not like 'demo-%' and (${STATE}) <> 'no_plan_yet'
        and (${f.from}::date is null or m.at >= ${f.from}::date) and (${f.to}::date is null or m.at < ${f.to}::date + 1)
  ) x order by event_at desc nulls last, match_id`;
}
// ---- Engagement (per user) ----
export const ENG_COLS = ["user_id", "name", "registered_at", "profile_completed_at", "last_activity_at", "active_7d", "active_30d", "coffee_requests_sent", "passes", "matches", "coffees_confirmed_now", "coffees_completed", "chat_messages_sent", "thank_yous_sent", "events_30d"];
export async function engagement(f) {
  return q`select * from (select u.id as user_id, u.name, u."createdAt" as registered_at, p."completedAt" as profile_completed_at,
    greatest(u."createdAt", (select max(s.at) from swipe s where s."fromId" = u.id), (select max(mm.at) from message mm where mm."fromId" = u.id), (select max(m.at) from match m where m.a = u.id or m.b = u.id), (select max(e.at) from event e where e."userId" = u.id and e.name <> 'ref_visit')) as last_activity_at,
    (select count(*)::int from swipe s where s."fromId" = u.id and s.yes) as coffee_requests_sent, (select count(*)::int from swipe s where s."fromId" = u.id and not s.yes) as passes,
    (select count(*)::int from match m where m.a = u.id or m.b = u.id) as matches,
    (select count(*)::int from match m where (m.a = u.id or m.b = u.id) and (m.status = 'confirmed' or (m.status is null and m."whenText" is not null)) and m.met is not true) as coffees_confirmed_now,
    (select count(*)::int from match m where (m.a = u.id or m.b = u.id) and m.met) as coffees_completed,
    (select count(*)::int from message mm where mm."fromId" = u.id) as chat_messages_sent, (select count(*)::int from thanks t where t."fromId" = u.id) as thank_yous_sent,
    (select count(*)::int from event e where e."userId" = u.id and e.at > now() - interval '30 days' and e.name <> 'ref_visit') as events_30d
    from "user" u left join profile p on p."userId" = u.id where u.id not like 'demo-%'
      and (${f.from}::date is null or u."createdAt" >= ${f.from}::date) and (${f.to}::date is null or u."createdAt" < ${f.to}::date + 1)
      and (${f.city}::text is null or p.city = ${f.city}) and (${f.industry}::text is null or p.industry = ${f.industry}) and (${f.source}::text is null or coalesce(u.source, 'direct') = ${f.source})) x
    cross join lateral (select (x.last_activity_at > now() - interval '7 days') as active_7d, (x.last_activity_at > now() - interval '30 days') as active_30d) a order by registered_at desc`;
}
// ---- Referrals ----
export const REF_COLS = ["referred_user_id", "referred_name", "registered_at", "profile_completed_at", "converted_to_complete_profile", "referrer_user_id", "referrer_name", "attribution", "signup_source", "signup_ref_code"];
export async function referrals(f) {
  return q`select u.id as referred_user_id, u.name as referred_name, u."createdAt" as registered_at, c."completedAt" as profile_completed_at, (c.id is not null) as converted_to_complete_profile,
    coalesce(u."referredBy", sa."referrerId", p."invitedBy") as referrer_user_id, r.name as referrer_name,
    case when u."referredBy" is not null or sa."referrerId" is not null then 'at_signup' else 'at_profile_completion' end as attribution, coalesce(sa.source, u.source) as signup_source, sa.ref as signup_ref_code
    from "user" u left join profile p on p."userId" = u.id left join signup_attr sa on sa."userId" = u.id left join complete_member c on c.id = u.id left join "user" r on r.id = coalesce(u."referredBy", sa."referrerId", p."invitedBy")
    where u.id not like 'demo-%' and coalesce(u."referredBy", sa."referrerId", p."invitedBy") is not null
      and (${f.from}::date is null or u."createdAt" >= ${f.from}::date) and (${f.to}::date is null or u."createdAt" < ${f.to}::date + 1)
    order by u."createdAt" desc`;
}
// ---- Network composition (long format) ----
export const NET_COLS = ["dimension", "value", "registered_users", "complete_profiles", "pct_of_complete_profiles", "users_with_match", "users_with_completed_coffee"];
export async function network(f) {
  const rows = await q`with base as (select u.id, (c.id is not null) as done, coalesce(nullif(p.city, ''), 'Not set') as city, coalesce(nullif(p.industry, ''), 'Not set') as industry, coalesce(u.source, 'direct') as source,
      case when jsonb_typeof(p.experience) <> 'array' or jsonb_array_length(p.experience) = 0 then 'none listed' when jsonb_array_length(p.experience) <= 2 then '1-2 roles' when jsonb_array_length(p.experience) <= 5 then '3-5 roles' else '6+ roles' end as exp,
      to_char(u."createdAt", 'YYYY-MM') as cohort, exists (select 1 from match m where m.a = u.id or m.b = u.id) as has_match, exists (select 1 from match m where (m.a = u.id or m.b = u.id) and m.met) as has_met, p.skills
      from "user" u left join profile p on p."userId" = u.id left join complete_member c on c.id = u.id where u.id not like 'demo-%'
        and (${f.from}::date is null or u."createdAt" >= ${f.from}::date) and (${f.to}::date is null or u."createdAt" < ${f.to}::date + 1)
        and (${f.city}::text is null or p.city = ${f.city}) and (${f.industry}::text is null or p.industry = ${f.industry}) and (${f.source}::text is null or coalesce(u.source, 'direct') = ${f.source})),
    long as (select 'city' as dimension, city as value, id, done, has_match, has_met from base union all select 'industry', industry, id, done, has_match, has_met from base union all select 'acquisition_source', source, id, done, has_match, has_met from base
      union all select 'experience_entries', exp, id, done, has_match, has_met from base union all select 'registration_month', cohort, id, done, has_match, has_met from base
      union all select 'skill', s, b.id, b.done, b.has_match, b.has_met from base b, jsonb_array_elements_text(case when jsonb_typeof(b.skills) = 'array' then b.skills else '[]'::jsonb end) s)
    select dimension, value, count(*)::int as registered_users, count(*) filter (where done)::int as complete_profiles, count(*) filter (where has_match)::int as users_with_match, count(*) filter (where has_met)::int as users_with_completed_coffee from long group by 1, 2 order by 1, 4 desc, 2`;
  const tot = {}; rows.forEach((r) => { if (r.dimension === "city") tot.t = (tot.t || 0) + r.complete_profiles; });
  const out = rows.map((r) => ({ ...r, pct_of_complete_profiles: tot.t ? Math.round((r.complete_profiles / tot.t) * 1000) / 10 : null }));
  for (const d of ["seniority", "language"]) out.push({ dimension: d, value: "unavailable", registered_users: null, complete_profiles: null, pct_of_complete_profiles: null, users_with_match: null, users_with_completed_coffee: null });
  return out;
}
// ---- Overview ----
export async function overview(f) {
  const ts = await trackedSince();
  const [k] = await q`select
    (select count(*)::int from "user" u where u.id not like 'demo-%' and (${f.from}::date is null or u."createdAt" >= ${f.from}::date) and (${f.to}::date is null or u."createdAt" < ${f.to}::date + 1)) as registrations,
    (select count(*)::int from complete_member c where (${f.from}::date is null or c."completedAt" >= ${f.from}::date) and (${f.to}::date is null or c."completedAt" < ${f.to}::date + 1)) as completed_profiles,
    (select count(*)::int from complete_member) as completed_profiles_all_time,
    (select count(*)::int from swipe s where s.yes and s."fromId" not like 'demo-%' and (${f.from}::date is null or s.at >= ${f.from}::date) and (${f.to}::date is null or s.at < ${f.to}::date + 1)) as coffee_requests,
    (select count(*)::int from swipe s where not s.yes and s."fromId" not like 'demo-%' and (${f.from}::date is null or s.at >= ${f.from}::date) and (${f.to}::date is null or s.at < ${f.to}::date + 1)) as passes,
    (select count(*)::int from match m where m.a not like 'demo-%' and m.b not like 'demo-%' and (${f.from}::date is null or m.at >= ${f.from}::date) and (${f.to}::date is null or m.at < ${f.to}::date + 1)) as matches_generated`;
  const st = await q`select ${STATE} as s, count(*)::int as n from match m where m.a not like 'demo-%' and m.b not like 'demo-%' and (${f.from}::date is null or m.at >= ${f.from}::date) and (${f.to}::date is null or m.at < ${f.to}::date + 1) group by 1`;
  const states = Object.fromEntries(st.map((r) => [r.s, r.n]));
  const [a] = await q`select count(*) filter (where la > now() - interval '7 days')::int as a7, count(*) filter (where la > now() - interval '30 days')::int as a30 from (select greatest(u."createdAt", (select max(s.at) from swipe s where s."fromId" = u.id), (select max(mm.at) from message mm where mm."fromId" = u.id), (select max(m.at) from match m where m.a = u.id or m.b = u.id), (select max(e.at) from event e where e."userId" = u.id and e.name <> 'ref_visit')) as la from "user" u where u.id not like 'demo-%') x`;
  let r;
  try { [r] = await q`select count(*)::int as n, count(*) filter (where exists (select 1 from complete_member c where c.id = u.id))::int as conv from "user" u left join profile p on p."userId" = u.id left join signup_attr sa on sa."userId" = u.id where u.id not like 'demo-%' and coalesce(u."referredBy", sa."referrerId", p."invitedBy") is not null and (${f.from}::date is null or u."createdAt" >= ${f.from}::date) and (${f.to}::date is null or u."createdAt" < ${f.to}::date + 1)`; }
  catch { [r] = await q`select count(*)::int as n, count(*) filter (where exists (select 1 from complete_member c where c.id = u.id))::int as conv from "user" u left join profile p on p."userId" = u.id where u.id not like 'demo-%' and coalesce(u."referredBy", p."invitedBy") is not null and (${f.from}::date is null or u."createdAt" >= ${f.from}::date) and (${f.to}::date is null or u."createdAt" < ${f.to}::date + 1)`; }
  const [rep] = await q`select count(*) filter (where n >= 2)::int as repeat_participants, count(*) filter (where c >= 2)::int as repeat_completed from (select u.id, (select count(*) from match m where m.a = u.id or m.b = u.id) as n, (select count(*) from match m where (m.a = u.id or m.b = u.id) and m.met) as c from "user" u where u.id not like 'demo-%') x`;
  let ev = null;
  if (ts) [ev] = await q`select count(*) filter (where e.name = 'coffee_cancelled')::int as cancelled, count(*) filter (where e.name = 'coffee_rescheduled')::int as rescheduled, count(*) filter (where e.name = 'coffee_completed')::int as completed,
      round(avg(extract(epoch from (e.at - (select min(p.at) from event p where p."matchId" = e."matchId" and p.name = 'coffee_proposed'))) / 3600) filter (where e.name = 'coffee_confirmed')::numeric, 1) as avg_hours_proposal_to_confirm
      from event e where e."matchId" is not null and e."userId" not like 'demo-%' and e.name = any(${COFFEE_EVENTS}) and (${f.from}::date is null or e.at >= ${f.from}::date) and (${f.to}::date is null or e.at < ${f.to}::date + 1)`;
  const trend = await q`select to_char(date_trunc('week', d), 'YYYY-MM-DD') as period, kind, count(*)::int as n from (
      select "createdAt" as d, 'registrations' as kind from "user" where id not like 'demo-%' union all select "completedAt", 'completed_profiles' from complete_member where "completedAt" is not null
      union all select at, 'matches' from match where a not like 'demo-%' union all select at, 'coffee_requests' from swipe where yes and "fromId" not like 'demo-%') t
    where d > now() - interval '12 weeks' group by 1, 2 order by 1, 2`;
  const [fu] = await q`select count(*)::int as registered, count(*) filter (where done)::int as complete, count(*) filter (where req)::int as requested, count(*) filter (where mt)::int as matched, count(*) filter (where conf)::int as confirmed, count(*) filter (where met)::int as completed_coffee from (
      select exists (select 1 from complete_member c where c.id = u.id) as done, exists (select 1 from swipe s where s."fromId" = u.id and s.yes) as req, exists (select 1 from match m where m.a = u.id or m.b = u.id) as mt,
        exists (select 1 from match m where (m.a = u.id or m.b = u.id) and (m.status = 'confirmed' or m.met or (m.status is null and m."whenText" is not null))) as conf, exists (select 1 from match m where (m.a = u.id or m.b = u.id) and m.met) as met
      from "user" u where u.id not like 'demo-%' and (${f.from}::date is null or u."createdAt" >= ${f.from}::date) and (${f.to}::date is null or u."createdAt" < ${f.to}::date + 1)) x`;
  return { k, states, active: a, referrals: r, repeat: rep, ev, trackedSince: ts, trend, funnel: fu };
}
export async function filterOptions() {
  const [cities, inds, srcs] = await Promise.all([q`select distinct city as v from profile where coalesce(city, '') <> '' order by 1`, q`select distinct industry as v from profile where coalesce(industry, '') <> '' order by 1`, q`select distinct coalesce(source, 'direct') as v from "user" order by 1`]);
  return { cities: cities.map((x) => x.v), industries: inds.map((x) => x.v), sources: srcs.map((x) => x.v) };
}
// Possible duplicate accounts (same name or same email ignoring case), for manual review. Read-only.
export async function duplicates() {
  return q`select 'same name' as reason, lower(trim(u.name)) as match_key, count(*)::int as accounts, string_agg(u.email || ' (' || to_char(u."createdAt", 'YYYY-MM-DD') || case when c.id is not null then ', finished' else '' end || ')', '; ' order by u."createdAt") as detail
      from "user" u left join complete_member c on c.id = u.id where u.id not like 'demo-%' and coalesce(trim(u.name), '') <> '' group by 2 having count(*) > 1
    union all select 'same email, different case', lower(u.email), count(*)::int, string_agg(u.email, '; ') from "user" u where u.id not like 'demo-%' group by 2 having count(*) > 1 order by 1, 3 desc`;
}

// ---- Coffee funnel (Admin > Coffee). Real users only. Anything not tracked before its start date is null ("Unavailable"), never 0 or estimated. ----
export async function coffeeFunnel() {
  const ts = await trackedSince(), now = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" }).replace(" ", "T").slice(0, 16);
  const PLAN = raw(`(m.status = 'confirmed' or m.status is null) and m."whenText" ~ '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}' and m.met is null`);
  const REAL = raw(`m.a not like 'demo-%' and m.b not like 'demo-%'`);
  const [req] = await q`with fy as (select distinct on (least("fromId", "toId"), greatest("fromId", "toId")) "fromId" as f, "toId" as t, at from swipe where yes and "fromId" not like 'demo-%' and "toId" not like 'demo-%' order by least("fromId", "toId"), greatest("fromId", "toId"), at asc)
    select count(*)::int as requests, count(*) filter (where r.yes)::int as accepted, count(*) filter (where r.yes is false)::int as declined, count(*) filter (where r.yes is null)::int as pending,
      round((percentile_cont(0.5) within group (order by extract(epoch from (m.at - fy.at)) / 3600) filter (where m.id is not null))::numeric, 1) as median_hours_request_to_match,
      round((avg(extract(epoch from (m.at - fy.at)) / 3600) filter (where m.id is not null))::numeric, 1) as avg_hours_request_to_match
    from fy left join swipe r on r."fromId" = fy.t and r."toId" = fy.f left join match m on (m.a = fy.f and m.b = fy.t) or (m.a = fy.t and m.b = fy.f)`;
  const [c] = await q`select (select count(*)::int from match m where ${REAL}) as matches_generated,
    (select count(*)::int from match m where ${REAL} and (m.status = 'confirmed' or m.status is null) and m."whenText" ~ '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}' and m.met is null and left(m."whenText", 16) >= ${now}) as scheduled_upcoming,
    (select count(*)::int from match m where ${REAL} and ${PLAN} and left(m."whenText", 16) < ${now}) as awaiting_confirmation,
    (select count(*)::int from match m where ${REAL} and m.met is true) as completed,
    (select count(*)::int from match m where ${REAL} and m.met is true and (select count(*) from coffee_confirmation c where c."matchId" = m.id and c.outcome = 'met') >= 2) as completed_both_confirmed,
    (select count(*)::int from match m where ${REAL} and m.met is true and not exists (select 1 from coffee_confirmation c where c."matchId" = m.id)) as completed_legacy_single_confirmation,
    (select count(*)::int from match m where ${REAL} and m.met is false) as did_not_happen,
    (select count(*)::int from match m where ${REAL} and m.met is null and (select count(*) from coffee_confirmation c where c."matchId" = m.id) = 1) as one_side_confirmed`;
  let ev = null;
  if (ts) [ev] = await q`select count(distinct e."matchId") filter (where e.name = 'coffee_confirmed')::int as scheduled_ever, count(*) filter (where e.name = 'coffee_cancelled')::int as cancelled, count(*) filter (where e.name = 'coffee_rescheduled')::int as rescheduled
    from event e where e."matchId" is not null and e."userId" not like 'demo-%'`;
  const [tm] = ts ? await q`select round((percentile_cont(0.5) within group (order by h))::numeric, 1) as median_hours, round(avg(h)::numeric, 1) as avg_hours, count(*)::int as n from (select extract(epoch from (min(e.at) - m.at)) / 3600 as h from match m join event e on e."matchId" = m.id and e.name = 'coffee_confirmed' where ${REAL} group by m.id, m.at) x` : [null];
  const [rg] = await q`select round((percentile_cont(0.5) within group (order by d))::numeric, 1) as median_days, round(avg(d)::numeric, 1) as avg_days, count(*)::int as n from (select extract(epoch from (min(e.at) - u."createdAt")) / 86400 as d from "user" u join match m on (m.a = u.id or m.b = u.id) join event e on e."matchId" = m.id and e.name = 'coffee_completed' where u.id not like 'demo-%' group by u.id, u."createdAt") x`;
  let fb = null; try { [fb] = await q`select count(*)::int as n, round(avg(rating)::numeric, 2) as avg_rating, count(*) filter (where again = 'yes')::int as again_yes, count(*) filter (where again = 'maybe')::int as again_maybe, count(*) filter (where again = 'no')::int as again_no from coffee_feedback where "userId" not like 'demo-%'`; } catch {}
  let wa = null; try { [wa] = await q`select count(*) filter (where name = 'whatsapp_connect_requested')::int as requested, count(*) filter (where name = 'whatsapp_connect_accepted')::int as accepted, count(*) filter (where name = 'whatsapp_chat_opened')::int as opened, count(*) filter (where name = 'whatsapp_connect_withdrawn')::int as withdrawn from event where "userId" not like 'demo-%'`; } catch {} // counts only, never numbers
  return { trackedSince: ts, req, c, ev, tm, rg, fb, wa };
}
