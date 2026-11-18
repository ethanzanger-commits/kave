import AdminNav from "../AdminNav";
import { requireAdmin } from "@/lib/admin";
import * as I from "@/lib/intel";
export const metadata = { title: "Intelligence · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";
const SECTIONS = [["overview", "Overview"], ["users", "Users"], ["matches", "Matches and coffees"], ["growth", "Growth and network"]];
const day = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "—");
const rate = (a, b) => (b > 0 ? Math.round((a / b) * 100) + "%" : "Unavailable");
const NA = ({ why }) => <>Unavailable{why ? <small> ({why})</small> : null}</>;
const Row = ({ t, children }) => <p style={{ margin: ".35rem 0" }}>{t}: <b>{children}</b></p>;
function Table({ cols, rows }) {
  return rows.length === 0 ? <p>No data yet.</p> : <div style={{ overflowX: "auto" }}><table><thead><tr>{cols.map((c) => <th key={c[0]}>{c[1]}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c[0]}>{c[2] ? c[2](r[c[0]], r) : (r[c[0]] ?? "—") + ""}</td>)}</tr>)}</tbody></table></div>;
}
function Exports({ qs }) {
  const L = [["Users", "Users.csv"], ["Matches", "Matches.csv"], ["Coffee_Activity", "Coffee_Activity.csv"], ["Engagement", "Engagement.csv"], ["Referrals", "Referrals.csv"], ["Network_Analysis", "Network_Analysis.csv"]];
  return <div className="card"><h2>Exports (CSV, Excel and Sheets compatible)</h2><p><small>Contain real names and emails. Keep private. Filtered uses the filters above; full ignores them. Blank cells mean the value was not recorded.</small></p>
    {L.map(([t, l]) => <p key={t} style={{ margin: ".4rem 0" }}><b>{l}</b>: <a href={`/admin/intelligence/export?type=${t}&${qs}`}>filtered</a> · <a href={`/admin/intelligence/export?type=${t}&full=1`}>full</a></p>)}</div>;
}
export default async function Intelligence({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams, f = I.parseFilters(sp), sec = SECTIONS.some((x) => x[0] === sp.section) ? sp.section : "overview";
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  let opt = { cities: [], industries: [], sources: [] }, body = null, err = "";
  try { opt = await I.filterOptions(); } catch {}
  try {
    if (sec === "overview") {
      const o = await I.overview(f), k = o.k, fu = o.funnel, ts = o.trackedSince, ev = o.ev, st = o.states;
      const periods = [...new Set(o.trend.map((t) => t.period))], kinds = ["registrations", "completed_profiles", "coffee_requests", "matches"];
      const cell = (p, kd) => o.trend.find((t) => t.period === p && t.kind === kd)?.n || 0;
      body = <>
        <div className="card"><h2>Headline numbers{f.from || f.to ? ` (${f.from || "start"} to ${f.to || "now"})` : " (all time)"}</h2>
          <Row t="Registrations">{k.registrations}</Row><Row t="Completed profiles in period">{k.completed_profiles}</Row><Row t="Completed profiles, all time">{k.completed_profiles_all_time}</Row>
          <Row t="Active users, last 7 days / 30 days">{o.active.a7} / {o.active.a30}</Row><p><small>Active = any request, match, chat message or tracked action. Page visits and sign-ins are not recorded.</small></p>
          <Row t="Coffee requests sent">{k.coffee_requests}</Row><Row t="Passes">{k.passes}</Row><Row t="Matches generated">{k.matches_generated}</Row>
          <Row t="Matches accepted">{<NA why="a match is mutual; there is no separate accept step" />}</Row><Row t="Matches declined"><NA why="no decline action exists; see Passes above" /></Row></div>
        <div className="card"><h2>Coffees (matches created in period, current state)</h2>
          <Row t="Completed (someone marked met)">{st.completed || 0}</Row><Row t="Confirmed, not yet marked met">{st.confirmed || 0}</Row><Row t="Proposed, unconfirmed">{st.proposed_unconfirmed || 0}</Row><Row t="Marked not met">{st.not_met || 0}</Row><Row t="No plan yet">{st.no_plan_yet || 0}</Row>
          <p><small>Completed means a participant answered "met" after the coffee. An accepted or confirmed plan is never counted as completed.</small></p>
          {ts ? <><Row t={`Cancellations (tracked since ${day(ts)})`}>{ev?.cancelled ?? 0}</Row><Row t={`Reschedules (tracked since ${day(ts)})`}>{ev?.rescheduled ?? 0}</Row><Row t="Avg hours, proposal to confirmation">{ev?.avg_hours_proposal_to_confirm ?? <NA why="no confirmed tracked plans yet" />}</Row></> : <><Row t="Cancellations"><NA why="not tracked until migration kave17 is run" /></Row><Row t="Reschedules"><NA why="same" /></Row></>}
          <Row t="Members with 2+ matches (repeat participation)">{o.repeat.repeat_participants}</Row><Row t="Members with 2+ completed coffees">{o.repeat.repeat_completed}</Row></div>
        <div className="card"><h2>Referrals</h2><Row t="Registrations with a referrer">{o.referrals.n}</Row><Row t="Of those, finished profile">{o.referrals.conv} ({rate(o.referrals.conv, o.referrals.n)})</Row></div>
        <div className="card"><h2>Funnel (users registered in period)</h2><Table cols={[["s", "Step"], ["n", "Users"], ["p", "% of registered"]]} rows={[["Registered", fu.registered], ["Finished profile", fu.complete], ["Sent a coffee request", fu.requested], ["Got a match", fu.matched], ["Has a confirmed coffee", fu.confirmed], ["Completed a coffee", fu.completed_coffee]].map(([s, n]) => ({ s, n, p: rate(n, fu.registered) }))} /></div>
        <div className="card"><h2>Weekly trend, last 12 weeks</h2><Table cols={[["p", "Week of"], ...kinds.map((x) => [x, x.replace("_", " ")])]} rows={periods.map((p) => ({ p, ...Object.fromEntries(kinds.map((x) => [x, cell(p, x)])) }))} /><p><small>Completed-coffee trend is unavailable before tracking began{ts ? ` (${day(ts)})` : ""}: the app never stored when a coffee was marked met.</small></p></div></>;
    } else if (sec === "users") {
      const rows = await I.users(f, 2000), dups = await I.duplicates().catch(() => []);
      body = <><div className="card"><h2>Possible duplicate accounts ({dups.length})</h2><p><small>Same name or same email in a different case. Review by hand; people who signed in with LinkedIn and email can end up with two accounts.</small></p><Table cols={[["reason", "Why"], ["match_key", "Match"], ["accounts", "Accounts"], ["detail", "Emails and dates"]]} rows={dups.slice(0, 30)} /></div><div className="card"><h2>Users ({rows.length >= 2000 ? "first 2000" : rows.length})</h2><p><small>Seniority and languages are not collected, so they appear only as unavailable in the export. Showing the newest 200.</small></p>
        <Table cols={[["name", "Name"], ["registered_at", "Registered", day], ["profile_completed_at", "Profile done", day], ["city", "City"], ["industry", "Industry"], ["headline", "Headline"], ["acquisition_source", "Source"], ["last_activity_at", "Last active", day]]} rows={rows.slice(0, 200)} /></div></>;
    } else if (sec === "matches") {
      const rows = await I.matches(f, 5000), n = (s) => rows.filter((r) => r.coffee_state === s).length, planned = n("proposed_unconfirmed") + n("confirmed") + n("completed") + n("not_met");
      const hrs = (c) => { const v = rows.map((r) => Number(r[c])).filter((x) => Number.isFinite(x) && x >= 0); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) + " h (n=" + v.length + ")" : null; };
      body = <><div className="card"><h2>Match and coffee status ({rows.length} matches)</h2>
        <Row t="Completed">{n("completed")}</Row><Row t="Confirmed, not marked met">{n("confirmed")}</Row><Row t="Proposed, unconfirmed">{n("proposed_unconfirmed")}</Row><Row t="Marked not met">{n("not_met")}</Row><Row t="No plan yet">{n("no_plan_yet")}</Row>
        <Row t="Plan confirmation rate (plans on record)">{rate(n("confirmed") + n("completed") + n("not_met"), planned)}</Row><p><small>Cancelled plans are erased by the app, so older plans on record are survivors; the true cancellation rate is only available from tracking onward.</small></p>
        <Row t="Completion rate of confirmed plans">{rate(n("completed"), n("confirmed") + n("completed") + n("not_met"))}</Row>
        <Row t="Avg match to first proposal">{hrs("hours_match_to_first_proposal") || <NA why="tracked matches only" />}</Row><Row t="Avg proposal to confirmation">{hrs("hours_proposal_to_confirmation") || <NA why="tracked matches only" />}</Row><Row t="Avg proposal to completion">{hrs("hours_proposal_to_completion") || <NA why="tracked matches only" />}</Row>
        <Row t="Thank-yous recorded (feedback)">{rows.reduce((a, r) => a + r.thank_yous, 0)}</Row></div>
        <div className="card"><h2>Latest matches</h2><Table cols={[["created_at", "Created", day], ["person_a_name", "Person A"], ["person_b_name", "Person B"], ["coffee_state", "State"], ["when_text", "When"], ["place", "Where"], ["cancellations", "Cancels"]]} rows={rows.slice(0, 100)} /></div></>;
    } else {
      const [net, refs] = await Promise.all([I.network(f), I.referrals(f).catch(() => null)]);
      const dims = [...new Set(net.map((r) => r.dimension))];
      body = <>
        <div className="card"><h2>Acquisition and referrals</h2>{refs === null ? <p><NA why="signup_attr table missing" /></p> : <><Row t="Referred registrations">{refs.length}</Row><Row t="Finished profile">{refs.filter((r) => r.converted_to_complete_profile).length} ({rate(refs.filter((r) => r.converted_to_complete_profile).length, refs.length)})</Row></>}
          <Table cols={[["value", "Source"], ["registered_users", "Registered"], ["complete_profiles", "Finished"], ["c", "Conversion", (_, r) => rate(r.complete_profiles, r.registered_users)], ["users_with_match", "With match"], ["users_with_completed_coffee", "Completed coffee"]]} rows={net.filter((r) => r.dimension === "acquisition_source")} /></div>
        {dims.filter((d) => d !== "acquisition_source").map((d) => <div className="card" key={d}><h2>By {d.replace("_", " ")}</h2>{d === "seniority" || d === "language" ? <p><NA why="not collected" /></p> : <Table cols={[["value", "Value"], ["registered_users", "Registered"], ["complete_profiles", "Finished"], ["pct_of_complete_profiles", "% of finished", (v) => (v == null ? "—" : v + "%")], ["users_with_match", "With match"], ["users_with_completed_coffee", "Completed coffee"]]} rows={net.filter((r) => r.dimension === d).slice(0, 25)} />}</div>)}</>;
    }
  } catch { err = "Could not load this section. A table may be missing; run the migrations in Neon (including kave17-admin-intel.sql)."; }
  const sel = (n, v, list) => <select name={n} defaultValue={v || ""}><option value="">{n}: any</option>{list.map((x) => <option key={x} value={x}>{x}</option>)}</select>;
  return (
    <main>
      <AdminNav />
      <h1>Intelligence</h1>
      <p>{SECTIONS.map(([k, l]) => <a key={k} href={`/admin/intelligence?section=${k}${qs ? "&" + qs : ""}`} style={{ marginRight: "1rem", fontWeight: k === sec ? 700 : 400 }}>{l}</a>)}</p>
      <form method="get" className="card"><input type="hidden" name="section" value={sec} />
        <p style={{ margin: ".3rem 0" }}>From <input type="date" name="from" defaultValue={f.from || ""} /> To <input type="date" name="to" defaultValue={f.to || ""} /></p>
        <p style={{ margin: ".3rem 0" }}>{sel("city", f.city, opt.cities)} {sel("industry", f.industry, opt.industries)} {sel("source", f.source, opt.sources)}</p>
        {sec === "users" && <p style={{ margin: ".3rem 0" }}><input name="q" placeholder="Search name or email" defaultValue={f.q || ""} /> <select name="complete" defaultValue={f.complete || ""}><option value="">profile: any</option><option value="yes">finished</option><option value="no">not finished</option></select></p>}
        {sec === "matches" && <p style={{ margin: ".3rem 0" }}><select name="state" defaultValue={f.state || ""}><option value="">state: any</option>{["completed", "confirmed", "proposed_unconfirmed", "not_met", "no_plan_yet"].map((x) => <option key={x}>{x}</option>)}</select></p>}
        <button>Apply filters</button> <a href={`/admin/intelligence?section=${sec}`}>Reset</a></form>
      {err && <p className="why">{err}</p>}
      {body}
      <Exports qs={qs} />
    </main>
  );
}
