import AdminNav from "../AdminNav";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { coffeeFunnel } from "@/lib/intel";
export const dynamic = "force-dynamic";
const na = "Unavailable";
const v = (x, u = "") => (x == null ? na : x + u);
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) + "%" : na);
export default async function CoffeeAdmin() {
  const s = await auth();
  if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) redirect("/");
  let d, err = ""; try { d = await coffeeFunnel(); } catch (e) { err = "Coffee tables are missing. Run migrations/kave19-coffee-flow.sql in Neon, then reload."; }
  if (err) return <main><AdminNav /><h1>Coffee funnel</h1><p className="why" role="alert">{err}</p></main>;
  const { req, c, ev, tm, rg, fb, wa, trackedSince: ts } = d, since = ts ? new Date(ts).toLocaleDateString("en-GB") : null;
  const row = (k, val, note) => <tr key={k}><td>{k}</td><td><b>{val}</b></td><td><small>{note}</small></td></tr>;
  return (
    <main>
      <AdminNav /><h1>Coffee funnel</h1>
      <p><small>Real members only (demo excluded). {since ? `Event tracking began ${since}; older history is shown as Unavailable, never estimated.` : "Event tracking has not started yet."}</small></p>
      <table><tbody>
        {row("Coffee requests (first yes in a pair)", req.requests, "")}
        {row("Matches generated (both said yes)", c.matches_generated, "")}
        {row("Requests accepted", req.accepted, "")}
        {row("Requests declined / pending", `${req.declined} / ${req.pending}`, "")}
        {row("Acceptance rate", pct(req.accepted, req.requests), "accepted ÷ requests")}
        {row("Time request to acceptance", v(req.median_hours_request_to_match, " h median"), `avg ${v(req.avg_hours_request_to_match, " h")}`)}
        {row("Time match to scheduled coffee", tm ? v(tm.median_hours, " h median") : na, tm ? `avg ${v(tm.avg_hours, " h")} · ${tm.n} coffees measured` : "tracked from " + (since || "launch"))}
        {row("Coffees scheduled now (upcoming)", c.scheduled_upcoming, "")}
        {row("Coffees scheduled ever (tracked)", ev ? ev.scheduled_ever : na, since ? "since " + since : "")}
        {row("Coffees completed (both confirmed)", c.completed_both_confirmed, "")}
        {row("Completed, older single confirmation", c.completed_legacy_single_confirmation, "marked before both-confirm rule; no timestamp")}
        {row("Awaiting confirmation", c.awaiting_confirmation, `${c.one_side_confirmed} have one confirmation`)}
        {row("Did not happen", c.did_not_happen, "")}
        {row("Coffees cancelled (tracked)", ev ? ev.cancelled : na, since ? "since " + since : "")}
        {row("Registration to first completed coffee", rg && rg.n ? v(rg.median_days, " days median") : na, rg && rg.n ? `avg ${v(rg.avg_days, " d")} · ${rg.n} members measured` : "needs completions recorded after tracking began")}
        {row("Private feedback submitted", fb ? fb.n : na, fb && fb.n ? `would meet again: ${fb.again_yes} yes, ${fb.again_maybe} maybe, ${fb.again_no} no · avg rating ${v(fb.avg_rating)}` : "aggregates only; notes are never shown")}
        {row("WhatsApp connect: requested / accepted (mutual)", wa ? `${wa.requested} / ${wa.accepted}` : na, "counts only; numbers are never shown here")}
        {row("WhatsApp chats opened / consent withdrawn", wa ? `${wa.opened} / ${wa.withdrawn}` : na, "")}
      </tbody></table>
    </main>
  );
}
