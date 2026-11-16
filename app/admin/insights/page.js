import AdminNav from "../AdminNav";
import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
export const metadata = { title: "Insights · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const STOPS = ["with", "that", "this", "have", "from", "your", "about", "their", "what", "when", "want", "more", "some", "into", "like", "help", "need", "looking", "people", "other", "would", "and", "the", "for", "are", "you", "our", "how", "who", "new", "learn", "working", "best", "good", "really", "just", "also", "very", "much", "make", "know"];
const delta = (a, b) => { a = Number(a); b = Number(b); if (!a && !b) return "no change"; if (!b) return "new this week"; const d = Math.round(((a - b) / b) * 100); return d === 0 ? "flat" : (d > 0 ? "+" : "") + d + "% vs last week"; };
function Bars({ rows, k = "n", label = "label" }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[k])));
  return rows.length === 0 ? <p>No data yet.</p> : rows.map((r) => <div key={r[label]}><p style={{ margin: ".4rem 0 0" }}>{r[label]}: <b>{r[k]}</b></p><div className="bar"><div style={{ width: pct(Number(r[k]), max) + "%" }} /></div></div>);
}
export default async function Insights() {
  const s = await auth();
  if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) redirect("/");
  let k, cities = [], inds = [], skills = [], byCity = [], drop = [], src = [], want = [], offer = [], refs = [], mail = 0, err = "";
  try {
    [[k], cities, inds, skills, byCity, drop, src, want, offer] = await Promise.all([
      client`select
        count(*) filter (where "createdAt" > now() - interval '7 days') as su7, count(*) filter (where "createdAt" <= now() - interval '7 days' and "createdAt" > now() - interval '14 days') as su14,
        (select count(*) from profile where "completedAt" > now() - interval '7 days' and not coalesce("isDemo", false)) as pf7, (select count(*) from profile where "completedAt" <= now() - interval '7 days' and "completedAt" > now() - interval '14 days' and not coalesce("isDemo", false)) as pf14,
        (select count(*) from swipe where yes and at > now() - interval '7 days' and "fromId" not like 'demo-%') as rq7, (select count(*) from swipe where yes and at <= now() - interval '7 days' and at > now() - interval '14 days' and "fromId" not like 'demo-%') as rq14,
        (select count(*) from match where at > now() - interval '7 days' and a not like 'demo-%') as mt7, (select count(*) from match where at <= now() - interval '7 days' and at > now() - interval '14 days' and a not like 'demo-%') as mt14,
        (select count(*) from match where met and at > now() - interval '7 days' and a not like 'demo-%') as mm7, (select count(*) from match where met and at <= now() - interval '7 days' and at > now() - interval '14 days' and a not like 'demo-%') as mm14,
        (select count(*) from event where name = 'linkedin_shared' and at > now() - interval '7 days') as ls7, (select count(*) from event where name = 'linkedin_shared' and at <= now() - interval '7 days' and at > now() - interval '14 days') as ls14,
        (select count(*) from event where name in ('invite_shared', 'card_shared') and at > now() - interval '7 days') as is7, (select count(*) from event where name in ('invite_shared', 'card_shared') and at <= now() - interval '7 days' and at > now() - interval '14 days') as is14
        from "user" where id not like 'demo-%'`,
      client`select coalesce(nullif(city, ''), 'Not set') as label, count(*) as n from profile where "ageOk" and not coalesce("isDemo", false) group by 1 order by 2 desc limit 10`,
      client`select coalesce(nullif(industry, ''), 'Not set') as label, count(*) as n from profile where "ageOk" and not coalesce("isDemo", false) group by 1 order by 2 desc limit 10`,
      client`select s as label, count(*) as n from profile p, jsonb_array_elements_text(case when jsonb_typeof(p.skills) = 'array' then p.skills else '[]'::jsonb end) s where p."ageOk" and not coalesce(p."isDemo", false) group by s order by 2 desc limit 12`,
      client`select coalesce(nullif(p.city, ''), 'Not set') as city, count(*) as matches, count(*) filter (where m."whenText" is not null and coalesce(m.status, 'confirmed') = 'confirmed') as booked, count(*) filter (where m.met) as met
        from match m join profile p on p."userId" = m.a where m.a not like 'demo-%' group by 1 order by 2 desc limit 8`,
      client`select case when d < 2 then '0-1 days' when d < 4 then '2-3 days' when d < 8 then '4-7 days' else '8+ days' end as label, count(*) as n from (select extract(epoch from (now() - u."createdAt")) / 86400 as d from "user" u left join profile p on p."userId" = u.id where u.id not like 'demo-%' and not coalesce(p."ageOk", false)) x group by 1 order by min(d)`,
      client`select coalesce(u.source, 'direct') as src, count(*) as total, count(*) filter (where p."ageOk") as finished from "user" u left join profile p on p."userId" = u.id where u.id not like 'demo-%' group by 1 order by 2 desc limit 8`,
      client`select w as label, count(*) as n from profile p, regexp_split_to_table(lower(coalesce(p."lookingFor", '')), '[^a-z]+') w where p."ageOk" and not coalesce(p."isDemo", false) and length(w) >= 4 group by w order by 2 desc limit 40`,
      client`select w as label, count(*) as n from profile p, regexp_split_to_table(lower(coalesce(p."canHelp", '')), '[^a-z]+') w where p."ageOk" and not coalesce(p."isDemo", false) and length(w) >= 4 group by w order by 2 desc limit 40`,
    ]);
    try { refs = await client`select coalesce(u.name, u.email) as label, count(*) as n from profile p join "user" u on u.id = p."invitedBy" where p."invitedBy" is not null and not coalesce(p."isDemo", false) group by u.id, u.name, u.email order by 2 desc limit 10`; [{ c: mail }] = await client`select count(*)::int as c from rate_hit where key = 'mail:day' and "at" > now() - interval '1 day'`; } catch {}
    const clean = (rows) => rows.filter((r) => !STOPS.includes(r.label)).slice(0, 10); want = clean(want); offer = clean(offer);
  } catch { err = "Couldn't load insights. Run the migrations in Neon, then reload."; }
  const N = (x) => Number(k?.[x] || 0);
  // Plain-English read-out built from the numbers (rules, not a language model).
  const notes = [];
  if (k) {
    const unfinished = drop.reduce((t, r) => t + Number(r.n), 0), stale = drop.filter((r) => r.label === "4-7 days" || r.label === "8+ days").reduce((t, r) => t + Number(r.n), 0);
    if (unfinished) notes.push(`${unfinished} sign-ups haven't finished a profile; ${stale} of them are over 4 days old. Message those people first from People.`);
    if (N("su7") > N("su14")) notes.push(`Sign-ups are up: ${N("su7")} this week vs ${N("su14")} last week.`); else if (N("su14") > N("su7")) notes.push(`Sign-ups slowed: ${N("su7")} this week vs ${N("su14")} last week. Time for another post.`);
    if (N("su7") > 0) notes.push(`${pct(N("pf7"), N("su7"))}% as many profiles were finished as sign-ups arrived this week.`);
    const top = byCity.find((r) => Number(r.matches) >= 3); if (top) notes.push(`${top.city} has the most matches (${top.matches}); ${pct(Number(top.met), Number(top.matches))}% of them have actually met.`);
    const gap = byCity.find((r) => Number(r.matches) >= 3 && Number(r.booked) === 0); if (gap) notes.push(`${gap.city} has matches but no booked coffees. Check whether members there are stuck on scheduling.`);
    const weak = src.find((r) => Number(r.total) >= 5 && pct(Number(r.finished), Number(r.total)) < 30); if (weak) notes.push(`Sign-ups from "${weak.src}" rarely finish their profile (${pct(Number(weak.finished), Number(weak.total))}%). That channel may need a clearer pitch.`);
    if (cities[0] && cities.length > 1 && Number(cities[0].n) > Number(cities[1].n) * 3) notes.push(`${cities[0].label} dominates membership, so matches elsewhere will be thin until more people join there.`);
  }
  const KPI = ({ t, a, b }) => <div><p style={{ margin: ".5rem 0 0" }}>{t}: <b>{a}</b> <small>({delta(a, b)})</small></p></div>;
  return (
    <main>
      <AdminNav />
      <h1>Insights</h1>
      {err && <p className="why">{err}</p>}
      {k && <>
        <div className="card"><h2>What stands out</h2>{notes.length === 0 ? <p>Not enough data yet.</p> : notes.map((t, i) => <p key={i} style={{ margin: ".4rem 0" }}>{t}</p>)}<p><small>Generated from your numbers with simple rules. Small counts swing a lot.</small></p></div>
        <div className="card"><h2>This week vs last week</h2>
          <KPI t="Sign-ups" a={N("su7")} b={N("su14")} /><KPI t="Profiles finished" a={N("pf7")} b={N("pf14")} /><KPI t="Coffee requests" a={N("rq7")} b={N("rq14")} /><KPI t="New matches" a={N("mt7")} b={N("mt14")} /><KPI t="Coffees that happened" a={N("mm7")} b={N("mm14")} /><KPI t="LinkedIn post clicks" a={N("ls7")} b={N("ls14")} /><KPI t="Invite and card shares" a={N("is7")} b={N("is14")} /></div>
        <div className="card"><h2>Top referrers</h2><p><small>Members whose invites turned into profiles. Thank them personally.</small></p><Bars rows={refs} /></div>
        <div className="card"><h2>Email budget</h2><p>{mail} sent in the last 24 hours, of about {process.env.MAIL_DAILY_CAP || (process.env.SMTP_HOST ? 2000 : 450)} allowed. Weekly picks and reminders pause at 75% so sign-in and coffee emails always send.</p></div>
        <div className="card"><h2>Unfinished sign-ups by age</h2><Bars rows={drop} /></div>
        <div className="card"><h2>Sign-up channels</h2>{src.length === 0 ? <p>No data yet.</p> : src.map((r) => <p key={r.src} style={{ margin: ".3rem 0" }}><b>{r.src}</b>: {r.total} signed up, {r.finished} finished ({pct(Number(r.finished), Number(r.total))}%)</p>)}</div>
        <div className="card"><h2>Matches to coffees, by city</h2>{byCity.length === 0 ? <p>No matches yet.</p> : byCity.map((r) => <p key={r.city} style={{ margin: ".3rem 0" }}><b>{r.city}</b>: {r.matches} matched, {r.booked} booked, {r.met} met</p>)}</div>
        <div className="card"><h2>Members by city</h2><Bars rows={cities} /></div>
        <div className="card"><h2>Members by industry</h2><Bars rows={inds} /></div>
        <div className="card"><h2>Top skills on Kave</h2><Bars rows={skills} /></div>
        <div className="card"><h2>What members want to learn</h2><p><small>Most common words in "What I'd like to learn".</small></p><Bars rows={want} /></div>
        <div className="card"><h2>What members can help with</h2><Bars rows={offer} /></div>
      </>}
      <div className="card"><h2>Export (CSV, opens in Excel)</h2>
        <p><small>These contain real names and emails. Keep the files private.</small></p>
        {[["members", "Members with finished profiles"], ["signups", "All sign-ups (finished or not)"], ["matches", "Matches and coffees"], ["requests", "Coffee requests"], ["events", "Activity events, last 90 days"], ["skills", "Skill counts"], ["referrers", "Top referrers"]].map(([t, l]) => <p key={t} style={{ margin: ".4rem 0" }}><a href={"/admin/export?type=" + t}>{l}</a></p>)}</div>
    </main>
  );
}
