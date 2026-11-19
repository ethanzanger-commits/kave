import Prompts from "../Prompts";
import SubmitButton from "@/app/SubmitButton";
import Nav from "../Nav";
import PendingActions from "../PendingActions";
import CoffeePanel from "../CoffeePanel";
import { short } from "@/lib/leaders";
import { auth } from "@/auth";
import { db, client } from "@/db";
import { profiles, users, matches, thanks, messages, intros, swipes } from "@/schema";
import { eq, or, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { blockUser, sendMessage, makeIntro, answerIntro, swipe, hideThanks } from "../actions";
import { acceptRequest } from "../coffeeActions";
import { starters, why } from "@/lib/match";
import LinkedInButton from "../LinkedInButton";
import AutoRefresh from "../messages/AutoRefresh";
import { cafePins } from "@/lib/cafes";
import WhatsAppConnect from "../WhatsAppConnect";
import { waStates } from "@/lib/whatsapp";
import { coffeeState, confsFor, STATE_LABEL } from "@/lib/coffee";
export default async function Matches() {
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent("/matches")); const me = s.user.id;
  const ms = await db.select().from(matches).where(or(eq(matches.a, me), eq(matches.b, me)));
  const ids = ms.map((m) => (m.a === me ? m.b : m.a));
  const sw = await db.select().from(swipes).where(or(eq(swipes.from, me), eq(swipes.to, me)));
  const matched = new Set(ids);
  const incoming = sw.filter((x) => x.to === me && x.yes && !sw.some((y) => y.from === me && y.to === x.from));
  const outgoing = sw.filter((x) => x.from === me && x.yes && !matched.has(x.to));
  const declined = sw.filter((x) => x.from === me && !x.yes && sw.some((y) => y.from === x.to && y.to === me && y.yes) && !matched.has(x.to)); // only I can see that I declined
  const wantIds = [...new Set([...ids, ...incoming.map((x) => x.from), ...outgoing.map((x) => x.to), ...declined.map((x) => x.to)])];
  const others = wantIds.length ? await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(inArray(profiles.userId, wantIds)) : [];
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const mids = ms.map((x) => x.id);
  const th = mids.length ? await db.select().from(thanks).where(inArray(thanks.matchId, mids)) : [];
  const msgs = mids.length ? await db.select().from(messages).where(inArray(messages.matchId, mids)) : [];
  const confs = await confsFor(mids);
  const was = await waStates(me, mids);
  let fbDone = new Set(); try { fbDone = new Set((await client`select "matchId" from coffee_feedback where "userId" = ${me}`).map((r) => r.matchId)); } catch {} // my own rows only
  const ints = (await db.select().from(intros).where(or(eq(intros.a, me), eq(intros.b, me)))).filter((i) => (i.a === me ? i.aYes : i.bYes) == null);
  const metPeople = ms.filter((x) => x.met === true).map((x) => (x.a === me ? x.b : x.a));
  const nameIds = [...new Set([...ints.flatMap((i) => [i.byId, i.a, i.b]), ...metPeople])];
  const names = nameIds.length ? Object.fromEntries((await db.select().from(users).where(inArray(users.id, nameIds))).map((u) => [u.id, short(u.name, u.email)])) : {};
  const pins = await cafePins(mine?.neighborhood);
  const near = pins.pins.map((x) => x.name).slice(0, 6);
  const invited = (await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.invitedBy, me))).length;
  const host = (await headers()).get("host");
  const of = (id) => others.find((x) => x.p.userId === id);
  const prio = (m) => { const st = coffeeState(m), my = confs.some((c) => c.matchId === m.id && c.userId === me); return (st === "proposed" && m.proposedBy !== me) || (st === "awaiting_confirmation" && !my) || st === "no_plan" ? 0 : st === "completed" || st === "did_not_happen" ? 2 : 1; };
  const sorted = [...ms].sort((x, y) => prio(x) - prio(y));
  const person = (x) => { const o = of(x); if (!o) return null; return (<>
    {o.u.image ? <img src={o.u.image} alt="" width="56" height="56" referrerPolicy="no-referrer" style={{ borderRadius: 2 }} /> : <div className="avatar">{(o.u.name || "?")[0]}</div>}
    <h2>{short(o.u.name, o.u.email)}</h2><p className="role">{[o.p.headline, o.p.company].filter(Boolean).join(" at ")}{o.p.city ? `, ${o.p.city}` : ""}</p>
    {o.p.about && <p>{o.p.about}</p>}<Prompts p={o.p} />
    {(o.p.skills || []).length > 0 && <p>{o.p.skills.slice(0, 5).map((k) => <span className="chip" key={k}>{k}</span>)}</p>}
    <p className="why"><b>Why you two?</b> {why(mine || {}, o.p)}</p></>); };
  return (
    <main>
      <Nav /><AutoRefresh />
      <h1>My coffees</h1>
      <p>{ms.length} matches · {ms.filter((m) => coffeeState(m) === "scheduled").length} scheduled · {ms.filter((x) => x.met === true).length} completed · {invited} friends invited</p>
      <PendingActions />
      <datalist id="cafes">{near.map((c) => <option key={c} value={c} />)}</datalist>
      <div id="requests" />
      {incoming.length > 0 && <section><h2>Coffee requests</h2>{incoming.map((x) => { const card = person(x.from); return (
        <div className="card" key={x.from}>
          <p className="status todo"><b>Pending</b> · your answer</p>
          {card || <p><b>Someone</b> would like to grab coffee.</p>}
          <div className="row"><form action={acceptRequest.bind(null, x.from)}><SubmitButton className="primary">Accept</SubmitButton></form><form action={swipe.bind(null, x.from, false)}><SubmitButton>Decline</SubmitButton></form></div>
        </div>); })}</section>}
      {outgoing.length > 0 && <section><h2>Waiting on a reply</h2>{outgoing.map((x) => { const o = of(x.to); return <p key={x.to}><b>{o ? short(o.u.name, o.u.email) : "Someone"}</b> · <span className="status">Pending</span></p>; })}</section>}
      {declined.length > 0 && <details className="card"><summary>Requests you declined ({declined.length})</summary>{declined.map((x) => { const o = of(x.to); return <div key={x.to} className="row"><span>{o ? short(o.u.name, o.u.email) : "Someone"} · <span className="status">Declined</span></span><form action={swipe.bind(null, x.to, true)}><SubmitButton>Changed my mind</SubmitButton></form></div>; })}</details>}
      {ints.map((i) => { const other = i.a === me ? i.b : i.a; return (
        <div className="card" key={i.id}><h2>Introduction</h2>
          <p>{names[i.byId]} thinks you'd get on with <b>{names[other]}</b>.{i.note ? ` "${i.note}"` : ""}</p>
          <div className="row"><form action={answerIntro}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="yes" value="1" /><SubmitButton className="primary">Yes, intro us</SubmitButton></form>
            <form action={answerIntro}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="yes" value="0" /><SubmitButton>Pass</SubmitButton></form></div></div>); })}
      {metPeople.length > 1 && <details className="card"><summary><b>Introduce two people you've met</b></summary>
        <form action={makeIntro}>
          <label>Person one<select name="a">{metPeople.map((id) => <option key={id} value={id}>{names[id]}</option>)}</select></label>
          <label>Person two<select name="b">{metPeople.map((id) => <option key={id} value={id}>{names[id]}</option>)}</select></label>
          <input name="note" maxLength={200} placeholder="Why they'd click (optional)" /><p></p><SubmitButton className="primary">Send introduction</SubmitButton>
        </form></details>}
      {ms.length === 0 && incoming.length === 0 && <p>No matches yet. Say Coffee? to a few people on Discover.</p>}
      {sorted.map((m) => {
        const o = of(m.a === me ? m.b : m.a); if (!o) return null; const st = coffeeState(m);
        return (
          <div className="card" key={m.id}>
            <p className="status"><b>Accepted</b> · {STATE_LABEL[st]}</p>
            {person(o.p.userId)}
            <CoffeePanel m={m} me={me} name={short(o.u.name, o.u.email)} mine={mine} oCity={o.p.city} confs={confs.filter((c) => c.matchId === m.id)} fb={fbDone.has(m.id) ? {} : null} thanks={th.filter((x) => x.matchId === m.id)} near={near} pins={pins} host={host} />
            <WhatsAppConnect id={m.id} name={short(o.u.name, o.u.email)} wa={was?.[m.id] || null} />
            <p><a href={`/coffee/${m.id}`}>Open full page</a></p>
            <details><summary>Message {short(o.u.name, o.u.email).split(" ")[0]}</summary>
              {msgs.filter((x) => x.matchId === m.id).sort((x, y) => x.at - y.at).slice(-5).map((x) => <p key={x.id} className={x.fromId === me ? "" : "why"} style={{ margin: ".3rem 0" }}><b>{x.fromId === me ? "You" : short(o.u.name, o.u.email)}:</b> {x.text}</p>)}
              <form action={sendMessage}><input type="hidden" name="id" value={m.id} /><input name="text" maxLength={500} placeholder="Say hi, one line" required /><p></p><SubmitButton>Send</SubmitButton></form></details>
            <details><summary>Topics to get you talking</summary><ul>{starters(mine || {}, o.p).map((q) => <li key={q}>{q}</li>)}</ul></details>
            <details><summary>Block or report</summary><div className="row"><form action={blockUser.bind(null, o.p.userId, "block")}><SubmitButton>Block</SubmitButton></form><form action={blockUser.bind(null, o.p.userId, "report")}><SubmitButton>Report</SubmitButton></form></div></details>
          </div>);
      })}
      <p>Your invite link: <b>{host}/join?ref={mine?.refCode}</b> · <a href={`https://wa.me/?text=${encodeURIComponent("Join me on kave: https://" + host + "/join?ref=" + mine?.refCode + "&src=invite-matches-whatsapp")}`}>Share on WhatsApp</a> · <LinkedInButton text={"I'm on Kave, a coffee-matching community for Israeli tech. Join me: https://" + host + "/join?ref=" + mine?.refCode + "&src=invite-matches-linkedin"}>Post on LinkedIn</LinkedInButton></p>
    </main>
  );
}
