import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
export default async function Analytics() {
  const s = await auth();
  if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) redirect("/");
  let f, weeks = [], active = [], ev = [], ttm = null, err = "";
  try {
    [[f], weeks, active, ev, [ttm]] = await Promise.all([
      client`select
        (select count(*) from "user" where id not like 'demo-%') as signed_up,
        (select count(*) from profile where "ageOk" and not coalesce("isDemo", false)) as profiled,
        (select count(distinct "fromId") from swipe where yes and "fromId" not like 'demo-%') as asked,
        (select count(*) from (select a u from match union select b from match) x where u not like 'demo-%') as matched,
        (select count(*) from (select a u from match where "whenText" is not null and coalesce(status, 'confirmed') = 'confirmed' union select b from match where "whenText" is not null and coalesce(status, 'confirmed') = 'confirmed') x where u not like 'demo-%') as booked,
        (select count(*) from (select a u from match where met union select b from match where met) x where u not like 'demo-%') as met,
        (select count(*) from profile where "invitedBy" is not null) as referred`,
      client`select to_char(date_trunc('week', "createdAt"), 'DD Mon') as wk, count(*) as c from "user" where id not like 'demo-%' and "createdAt" > now() - interval '8 weeks' group by date_trunc('week', "createdAt") order by date_trunc('week', "createdAt")`,
      client`select to_char(date_trunc('week', at), 'DD Mon') as wk, count(distinct "userId") as c from event where at > now() - interval '8 weeks' and name <> 'ref_visit' group by date_trunc('week', at) order by date_trunc('week', at)`,
      client`select name, count(*) as c, count(distinct "userId") as u from event where at > now() - interval '30 days' group by name order by c desc`,
      client`select round(avg(extract(epoch from (m.at - u."createdAt")) / 86400)::numeric, 1) as days from (select u2, min(at) as at from (select a as u2, at from match union all select b, at from match) y group by u2) m join "user" u on u.id = m.u2 where u.id not like 'demo-%'`,
    ]);
  } catch { err = "Analytics tables are missing. Run the analytics SQL in Neon, then reload."; }
  const n = (k) => Number(f?.[k] || 0);
  const steps = f ? [["Signed up", n("signed_up")], ["Profile done", n("profiled")], ["Asked for a coffee", n("asked")], ["Matched", n("matched")], ["Coffee booked", n("booked")], ["Coffee happened", n("met")]] : [];
  const max = Math.max(1, ...weeks.map((w) => Number(w.c)), ...active.map((w) => Number(w.c)));
  return (
    <main>
      <nav><a href="/admin">Admin</a><a href="/admin/growth">Growth</a><a href="/discover">App</a></nav>
      <h1>Analytics</h1>
      {err && <p className="why">{err}</p>}
      {f && <>
        <div className="card"><h2>Funnel (real users)</h2>
          {steps.map(([label, v], i) => (
            <div key={label}><p style={{ margin: ".6rem 0 0" }}><b>{label}</b>: {v} <small>({pct(v, steps[0][1])}% of sign-ups{i > 0 ? `, ${pct(v, steps[i - 1][1])}% of previous step` : ""})</small></p>
              <div className="bar"><div style={{ width: pct(v, steps[0][1]) + "%" }} /></div></div>))}
        </div>
        <div className="card"><h2>Growth</h2>
          <p>Friends referred: {n("referred")} ({n("profiled") ? (n("referred") / n("profiled")).toFixed(2) : "0"} per finished profile)</p>
          <p>Average days from sign-up to first match: {ttm?.days ?? "no data yet"}</p></div>
        <div className="card"><h2>New sign-ups per week</h2>
          {weeks.length === 0 && <p>No data yet.</p>}
          {weeks.map((w) => <div key={w.wk}><p style={{ margin: ".4rem 0 0" }}>{w.wk}: {w.c}</p><div className="bar"><div style={{ width: pct(Number(w.c), max) + "%" }} /></div></div>)}</div>
        <div className="card"><h2>Active members per week</h2>
          {active.length === 0 && <p>No data yet. It fills in as people use kave.</p>}
          {active.map((w) => <div key={w.wk}><p style={{ margin: ".4rem 0 0" }}>{w.wk}: {w.c}</p><div className="bar"><div style={{ width: pct(Number(w.c), max) + "%" }} /></div></div>)}</div>
        <div className="card"><h2>Actions, last 30 days</h2>
          {ev.length === 0 && <p>No events yet.</p>}
          {ev.map((e) => <p key={e.name} style={{ margin: ".2rem 0" }}><b>{e.name}</b>: {e.c} by {e.u} {Number(e.u) === 1 ? "person" : "people"}</p>)}</div>
      </>}
    </main>
  );
}
