import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import { communityStats } from "@/lib/community";
import { reminderCfg } from "@/lib/settings";
import { missing } from "@/lib/complete";
import { toggleReminders, saveReminderSettings } from "../actions";
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const Row = ({ k, v, sub }) => <p style={{ margin: ".35rem 0" }}><b>{k}:</b> {v}{sub ? <small> ({sub})</small> : null}</p>;
export default async function Growth() {
  const s = await auth();
  if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) redirect("/");
  let m, top = [], cfg, err = "";
  const stats = await communityStats(client);
  try {
    [[m], top, cfg] = await Promise.all([
      client`select
        (select count(*) from "user" where id not like 'demo-%')::int as registrations,
        (select count(*) from event where name in ('invite_shared','card_shared'))::int as shares,
        (select count(*) from event where name = 'ref_visit')::int as visits,
        (select count(*) from profile where "invitedBy" is not null)::int as ref_regs,
        (select count(*) from swipe where yes and "fromId" not like 'demo-%')::int as requests,
        (select count(*) from match where a not like 'demo-%' and b not like 'demo-%')::int as accepted,
        (select count(distinct "userId") from event where at > now() - interval '7 days' and name <> 'ref_visit')::int as wau,
        (select count(*) from reminder where status = 'sent')::int as r_sent,
        (select count(*) from reminder where status = 'failed')::int as r_failed,
        (select count(*) from reminder where "clickedAt" is not null)::int as r_clicks,
        (select count(distinct r."userId") from reminder r join profile p on p."userId" = r."userId" where r.status = 'sent' and p."ageOk" and p."updatedAt" > r."sentAt")::int as r_done`,
      client`select u.name, count(*)::int as c from profile p join "user" u on u.id = p."invitedBy" where p."invitedBy" is not null group by u.id, u.name order by c desc limit 10`,
      reminderCfg(client),
    ]);
  } catch { err = "Run migrations/kave2.sql in Neon first, then reload."; }
  let inc = [], gaps = {}, total = 0, withPhoto = 0;
  try {
    const rows = await client`select u.id, u.name, u.email, u.image, p.headline, p.about, p.city, p.skills, p."ageOk", extract(epoch from (now() - u."createdAt")) / 86400 as days, (select count(*) from reminder r where r."userId" = u.id and r.status = 'sent')::int as rem from "user" u left join profile p on p."userId" = u.id where u.id not like 'demo-%' order by u."createdAt" desc limit 500`;
    total = rows.length; withPhoto = rows.filter((r) => r.image).length;
    inc = rows.map((r) => ({ ...r, miss: missing(r, r.image) })).filter((r) => r.miss.length);
    inc.forEach((r) => r.miss.forEach((x) => { gaps[x] = (gaps[x] || 0) + 1; }));
  } catch {}
  const regs = m?.registrations || 0;
  return (
    <main>
      <nav><a href="/admin">Admin</a><a href="/admin/analytics">Analytics</a><a href="/discover">App</a></nav>
      <h1>Growth</h1>
      {err && <p className="why">{err}</p>}
      {m && <>
        <div className="card"><h2>Profiles</h2>
          <Row k="Total registrations" v={regs} />
          <Row k="Completed profiles" v={stats.count} sub={pct(stats.count, regs) + "% completion rate"} />
          <Row k="Incomplete profiles" v={Math.max(0, regs - stats.count)} />
          <Row k="Founding 50" v={`${50 - stats.foundingLeft} of 50 claimed`} />
          <div className="bar"><div style={{ width: pct(50 - stats.foundingLeft, 50) + "%" }} /></div>
          <Row k="Next milestone" v={`${stats.count} of ${stats.target}`} /></div>
        <div className="card"><h2>Referrals</h2>
          <Row k="Invitation shares" v={m.shares} />
          <Row k="Referral link visits" v={m.visits} />
          <Row k="Completed referral profiles" v={m.ref_regs} />
          <Row k="Visit to completed profile" v={pct(m.ref_regs, m.visits) + "%"} />
          <h2 style={{ marginTop: "1rem" }}>Top referrers</h2>
          {top.length === 0 ? <p>No referrals yet.</p> : top.map((t) => <Row key={t.name} k={t.name || "Someone"} v={t.c} />)}</div>
        <div className="card"><h2>Coffee</h2>
          <Row k="Coffee requests sent" v={m.requests} />
          <Row k="Requests accepted (matches)" v={m.accepted} />
          <Row k="Weekly active users" v={m.wau} /></div>
        <div className="card"><h2>Profile reminders</h2>
          <Row k="Sent" v={m.r_sent} sub={m.r_failed + " failed"} />
          <Row k="Link clicks" v={m.r_clicks} />
          <Row k="Completed after a reminder" v={m.r_done} />
          <form action={toggleReminders}><button className={cfg.paused ? "primary" : ""}>{cfg.paused ? "Paused. Tap to resume" : "Running. Tap to pause"}</button></form>
          <form action={saveReminderSettings}>
            <label>First reminder (hours after sign-up)<input name="h1" type="number" min="1" defaultValue={cfg.h1} /></label>
            <label>Second reminder (hours)<input name="h2" type="number" min="1" defaultValue={cfg.h2} /></label>
            <label>Third reminder (hours)<input name="h3" type="number" min="1" defaultValue={cfg.h3} /></label>
            <p></p><button>Save timing</button></form></div>
      </>}
      {total > 0 && <>
        <div className="card"><h2>Onboarding drop-off</h2>
          <Row k="Registered" v={total} />
          <Row k="Added a photo" v={withPhoto} sub={pct(withPhoto, total) + "%"} />
          <Row k="Finished profile" v={total - inc.length} sub={pct(total - inc.length, total) + "%"} />
          <h2 style={{ marginTop: "1rem" }}>Where people get stuck</h2>
          {Object.keys(gaps).length === 0 ? <p>Nobody is stuck.</p> : Object.entries(gaps).sort((a, b) => b[1] - a[1]).map(([k, v]) => <Row key={k} k={"Missing " + k} v={v} />)}</div>
        <div className="card"><h2>Incomplete sign-ups ({inc.length})</h2><p style={{ margin: 0 }}><small>Newest first. A personal message works best.</small></p>
          {inc.slice(0, 30).map((r) => <p key={r.id} style={{ margin: ".6rem 0" }}><b>{r.name || "No name"}</b> · <a href={"mailto:" + r.email}>{r.email}</a><br /><small>{Math.floor(r.days)}d ago · missing {r.miss.join(", ")} · {r.rem} reminders sent</small></p>)}</div>
      </>}
    </main>
  );
}
