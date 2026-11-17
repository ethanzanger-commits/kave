import { requireAdmin } from "@/lib/admin";
import { client } from "@/db";
import AdminNav from "../AdminNav";
import { weekly, channels, clicksBySource, referrers, activeUsers } from "@/lib/growth";
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) + "%" : "-");
const Table = ({ head, rows }) => <div style={{ overflowX: "auto" }}><table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>;
export default async function Weekly() {
  await requireAdmin();
  let wk = [], ch = [], clicks = [], refs = [], act = null, err = "";
  try { [wk, ch, clicks, refs, act] = await Promise.all([weekly(client), channels(client), clicksBySource(client), referrers(client), activeUsers(client)]); } catch { err = "Run migrations/kave8-growth.sql in Neon first, then reload."; }
  const click = Object.fromEntries(clicks.map((c) => [c.source, c.clicks]));
  const delta = (i, k) => (wk[i + 1] ? (wk[i][k] - wk[i + 1][k] >= 0 ? "+" : "") + (wk[i][k] - wk[i + 1][k]) : "");
  return (
    <main>
      <AdminNav />
      <h1>Weekly growth</h1>
      <p className="lead">Weeks start Monday, Israel time. Every number is counted from real records: accounts, profiles, requests, matches. Link taps are clicks and are shown separately.</p>
      {err && <p className="why">{err}</p>}
      {act && <p><b>{act.members}</b> completed members. <b>{act.wau}</b> active in the last 7 days, <b>{act.mau}</b> in the last 30 (a request, match or message counts as active).</p>}
      {wk.length > 0 && <>
        <div className="card"><h2>What happened each week</h2>
          <Table head={["Week", "Signed up", "Completed", "Activated", "Requests", "Matched", "Confirmed"]} rows={wk.map((w, i) => [w.label, `${w.regs} (${delta(i, "regs")})`, `${w.completed} (${delta(i, "completed")})`, w.activated, w.asks, w.accepted, w.confirmed])} />
          <p><small>Activated = completed profile plus a first coffee request or match. Confirmed = coffees both people agreed to, by the date of the coffee. Brackets show the change from the week before.</small></p></div>
        <div className="card"><h2>Conversion by sign-up week</h2>
          <Table head={["Joined", "Signed up", "Completed", "Activated", "Confirmed coffee"]} rows={wk.map((w) => [w.label, w.regs, pct(w.cohort_completed, w.regs), pct(w.cohort_activated, w.regs), pct(w.cohort_confirmed, w.regs)])} />
          <p><small>Of everyone who signed up that week, how many have got that far so far. Recent weeks keep rising.</small></p></div>
      </>}
      {ch.length > 0 && <div className="card"><h2>Which channels bring activated members</h2>
        <Table head={["Source", "Clicks", "Signed up", "Completed", "Activated", "Confirmed"]} rows={ch.map((c) => [c.source, click[c.source] ?? "-", c.registered, `${c.completed} (${pct(c.completed, c.registered)})`, `${c.activated} (${pct(c.activated, c.registered)})`, c.confirmed])} />
        <p><small>"unknown" means signed up before tracking started. To track a channel, share <b>/go/linkedin</b>, <b>/go/whatsapp</b> or <b>/go/anything</b> after your site address instead of the plain link.</small></p></div>}
      {refs.length > 0 && <div className="card"><h2>Top referrers</h2>
        <Table head={["Member", "Clicks", "Signed up", "Completed", "Activated"]} rows={refs.map((r) => [r.name || r.email, r.clicks, r.registered, r.completed, r.activated])} /></div>}
    </main>
  );
}
