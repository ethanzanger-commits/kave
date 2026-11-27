import Prompts from "../Prompts";
import Nav from "../Nav";
import { short } from "@/lib/leaders";
import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, users, matches, thanks, messages, intros, swipes, blocks } from "@/schema";
import { eq, or, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { schedule, blockUser, checkIn, sendThanks, respond, sendMessage, makeIntro, answerIntro, swipe, hideThanks } from "../actions";
import BookForm from "../BookForm";
import { starters } from "@/lib/match";
import { cafePins } from "@/lib/cafes";
import { fmt, gcal } from "@/lib/fmt";
export const metadata = { title: "My Coffees · Kave" };
const Sec = ({ title, n, note, empty, children }) => (
  <section aria-label={title}>
    <div className="section-h"><h2>{title}{n > 0 ? ` (${n})` : ""}</h2>{note && <small>{note}</small>}</div>
    {n === 0 ? <div className="empty">{empty}</div> : children}
  </section>
);
export default async function Matches() {
  const s = await auth(); if (!s?.user?.id) redirect("/"); const me = s.user.id;
  const ms = await db.select().from(matches).where(or(eq(matches.a, me), eq(matches.b, me)));
  const ids = ms.map((m) => (m.a === me ? m.b : m.a));
  const others = ids.length ? await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(inArray(profiles.userId, ids)) : [];
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const mids = ms.map((x) => x.id);
  const th = mids.length ? await db.select().from(thanks).where(inArray(thanks.matchId, mids)) : [];
  const msgs = mids.length ? await db.select().from(messages).where(inArray(messages.matchId, mids)) : [];
  const ints = (await db.select().from(intros).where(or(eq(intros.a, me), eq(intros.b, me)))).filter((i) => (i.a === me ? i.aYes : i.bYes) == null);
  const metPeople = ms.filter((x) => x.met === true).map((x) => (x.a === me ? x.b : x.a));
  const sw = await db.select().from(swipes).where(or(eq(swipes.from, me), eq(swipes.to, me)));
  const bl = await db.select().from(blocks).where(or(eq(blocks.from, me), eq(blocks.to, me)));
  const blocked = new Set(bl.map((b) => (b.from === me ? b.to : b.from)));
  const matched = new Set(ids);
  const incoming = sw.filter((x) => x.to === me && x.yes && !blocked.has(x.from) && !sw.some((y) => y.from === me && y.to === x.from));
  const outgoing = sw.filter((x) => x.from === me && x.yes && !matched.has(x.to) && !blocked.has(x.to));
  const nameIds = [...new Set([...ints.flatMap((i) => [i.byId, i.a, i.b]), ...metPeople, ...incoming.map((x) => x.from), ...outgoing.map((x) => x.to)])];
  const people = nameIds.length ? await db.select({ p: profiles, u: users }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(inArray(users.id, nameIds)) : [];
  const names = Object.fromEntries(people.map((r) => [r.u.id, short(r.u.name, r.u.email)]));
  const heads = Object.fromEntries(people.map((r) => [r.u.id, r.p?.headline || ""]));
  const pins = await cafePins(mine?.city || mine?.neighborhood);
  const near = pins.pins.map((x) => x.name).slice(0, 6);
  const invited = (await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.invitedBy, me))).length;
  const host = (await headers()).get("host");
  const now = new Date();
  const booked = (m) => m.when && m.status !== "proposed";
  const future = (m) => new Date(m.when) > now;
  // Bucket every match by who needs to act next.
  const upcoming = ms.filter((m) => booked(m) && future(m));
  const needsCheckin = ms.filter((m) => booked(m) && !future(m) && m.met == null);
  const pastDone = ms.filter((m) => booked(m) && !future(m) && m.met != null);
  const theyProposed = ms.filter((m) => m.status === "proposed" && m.proposedBy !== me);
  const iProposed = ms.filter((m) => m.status === "proposed" && m.proposedBy === me);
  const toArrange = ms.filter((m) => !booked(m) && m.status !== "proposed");
  const pendingCount = incoming.length + ints.length + theyProposed.length + toArrange.length + needsCheckin.length;
  const waitingCount = outgoing.length + iProposed.length;
  const place = (mine?.city || mine?.neighborhood || "");
  const Match = ({ m, next }) => {
    const o = others.find((x) => x.p.userId === (m.a === me ? m.b : m.a)); if (!o) return null;
    const oname = short(o.u.name, o.u.email);
    return (
      <div className="card" key={m.id}>
        <div className="who">
          <a href={"/member/" + o.p.userId}>{o.u.image ? <img src={o.u.image} alt={`Photo of ${oname}`} width="56" height="56" referrerPolicy="no-referrer" /> : <div className="avatar">{(o.u.name || "?")[0]}</div>}</a>
          <div><h2 style={{ margin: 0 }}><a href={"/member/" + o.p.userId}>{oname}</a></h2><p className="role" style={{ margin: 0 }}>{o.p.headline}</p></div>
        </div>
        {next && <p className="next">{next}</p>}
        {m.status === "proposed" && <div className="why"><p style={{ margin: 0 }}>{m.proposedBy === me ? "You suggested" : "They suggested"}: {fmt(m.when)} at {m.place}</p>
          <form action={respond}><input type="hidden" name="id" value={m.id} />{m.proposedBy !== me && <button name="a" value="accept" className="primary">Accept</button>}<button name="a" value="cancel">{m.proposedBy === me ? "Withdraw" : "Decline"}</button></form></div>}
        {booked(m) && <>
          <p>Booked: {fmt(m.when)} at {m.place}. <a href={`/card/${m.id}`}>Coffee card</a>{" · "}<a href={`/coffee/${m.id}`}>Cheat sheet</a>{" · "}
            <a href={`https://wa.me/?text=${encodeURIComponent("Coffee booked on kave https://" + host + "/card/" + m.id)}`}>WhatsApp</a>
            {gcal(m) && <>{" · "}<a href={gcal(m)}>Add to calendar</a></>}</p>
          {m.place && future(m) && <><iframe title={"Map of " + m.place} src={"https://www.google.com/maps?q=" + encodeURIComponent(m.place + " " + place) + "&output=embed"} width="100%" height="200" loading="lazy" style={{ border: 0 }} referrerPolicy="no-referrer-when-downgrade" />
            <p><a href={"https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(m.place + " " + place)} target="_blank" rel="noopener noreferrer">Get directions</a></p></>}
          {future(m) && <form action={respond}><input type="hidden" name="id" value={m.id} /><button name="a" value="cancel">Cancel this coffee</button></form>}
          {m.met == null && !future(m) && <form action={checkIn}><input type="hidden" name="id" value={m.id} />
            <button name="met" value="yes" className="primary">Yes, we met</button><p></p><button name="met" value="no">It didn't happen</button></form>}
          {m.met === true && <>
            {th.filter((x) => x.fromId !== me).map((x) => <div key={x.fromId}><p className="why">{x.text}</p>{x.isPublic && !x.hidden && <form action={hideThanks}><input type="hidden" name="id" value={m.id} /><button>Hide from my profile</button></form>}</div>)}
            {!th.some((x) => x.fromId === me) && <form action={sendThanks}><input type="hidden" name="id" value={m.id} /><input name="text" maxLength={140} placeholder="Say thanks in one line" required /><label style={{ display: "flex", gap: ".5rem", alignItems: "center", fontWeight: 400 }}><input type="checkbox" name="public" style={{ width: "auto", minHeight: 0, margin: 0 }} />Also show it on their profile</label><button>Send thanks</button></form>}
            <p className="hint">Enjoyed it? <a href="/invite">Invite someone who'd enjoy a coffee like this</a>.</p>
          </>}
          {m.met === false && <p>Thanks for checking in.</p>}
        </>}
        {!booked(m) && m.status !== "proposed" && <BookForm id={m.id} cafes={near} schedule={schedule} hood={place} center={pins.center} pins={pins.pins} />}
        {o.p.about && !booked(m) && <p>{o.p.about}</p>}
        {!(m.met != null) && <Prompts p={o.p} />}
        {m.met == null && <>
          <div>
            {msgs.filter((x) => x.matchId === m.id).sort((x, y) => x.at - y.at).slice(-5).map((x) => <p key={x.id} className={x.fromId === me ? "" : "why"} style={{ margin: ".3rem 0" }}><b>{x.fromId === me ? "You" : oname}:</b> {x.text}</p>)}
            <form action={sendMessage}><input type="hidden" name="id" value={m.id} /><input name="text" maxLength={500} placeholder="Say hi, one line" required /><p></p><button>Send</button></form>
          </div>
          <details><summary><b>Topics to get you talking</b></summary><ul>{starters(mine, o.p).map((q) => <li key={q}>{q}</li>)}</ul></details>
        </>}
        <div className="meta" style={{ display: "flex", gap: "1rem" }}><form action={blockUser.bind(null, o.p.userId, "block")}><button className="linkbtn">Block</button></form><form action={blockUser.bind(null, o.p.userId, "report")}><button className="linkbtn">Report</button></form></div>
      </div>
    );
  };
  const Req = ({ x, who, children }) => (
    <div className="card" key={x}><p style={{ margin: 0 }}><b>{names[who] || "Someone"}</b>{heads[who] ? <small> · {heads[who]}</small> : null}</p>{children}</div>
  );
  return (
    <main>
      <Nav />
      <h1>My Coffees</h1>
      <p className="meta">{ms.length} {ms.length === 1 ? "match" : "matches"} · {ms.filter((m) => booked(m)).length} booked · {ms.filter((x) => x.met === true).length} had · <a href="/invite">{invited} {invited === 1 ? "friend" : "friends"} invited</a></p>
      {near.length > 0 && <p className="hint">Cafés near {place}: {near.join(", ")}. Map data © OpenStreetMap contributors</p>}
      <datalist id="cafes">{near.map((c) => <option key={c} value={c} />)}</datalist>

      <Sec title="Pending requests" n={pendingCount} note="These are waiting on you" empty={<><b>Nothing waiting on you.</b> Head to <a href="/discover">Discover</a> to meet someone new.</>}>
        {incoming.map((x) => <Req key={x.from} x={x.from} who={x.from}><p className="next">{names[x.from] || "Someone"} would like to meet for coffee.</p>
          <div className="row"><form action={swipe.bind(null, x.from, true)}><button className="primary">Accept</button></form><form action={swipe.bind(null, x.from, false)}><button>Not now</button></form></div></Req>)}
        {ints.map((i) => { const other = i.a === me ? i.b : i.a; return (
          <div className="card" key={i.id}><p className="next">{names[i.byId]} thinks you'd get on with {names[other]}.{i.note ? ` "${i.note}"` : ""}</p>
            <div className="row"><form action={answerIntro}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="yes" value="1" /><button className="primary">Yes, intro us</button></form>
              <form action={answerIntro}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="yes" value="0" /><button>Pass</button></form></div></div>); })}
        {theyProposed.map((m) => <Match key={m.id} m={m} next="They suggested a time. Accept it or decline." />)}
        {toArrange.map((m) => <Match key={m.id} m={m} next="It's a match. Pick a café and a time." />)}
        {needsCheckin.map((m) => <Match key={m.id} m={m} next="Did your coffee happen?" />)}
      </Sec>

      <Sec title="Upcoming coffees" n={upcoming.length} empty={<><b>No coffees booked yet.</b> Once you and a match agree on a time, it shows up here with directions and a calendar link.</>}>
        {upcoming.sort((a, b) => new Date(a.when) - new Date(b.when)).map((m) => <Match key={m.id} m={m} next="Booked. See you there." />)}
      </Sec>

      <Sec title="Waiting for a reply" n={waitingCount} note="Nothing to do but wait" empty={<><b>You're not waiting on anyone.</b> Requests you send and times you suggest appear here.</>}>
        {outgoing.map((x) => <Req key={x.to} x={x.to} who={x.to}><p className="meta" style={{ margin: ".2rem 0 0" }}>You asked for a coffee. We'll email you when they reply.</p></Req>)}
        {iProposed.map((m) => <Match key={m.id} m={m} next="Waiting for them to accept your time." />)}
      </Sec>

      <Sec title="Past coffees" n={pastDone.length} empty={<><b>No past coffees yet.</b> After you meet, you can say thanks and introduce two people you've met.</>}>
        {metPeople.length > 1 && <details className="card"><summary><b>Introduce two people you've met</b></summary>
          <form action={makeIntro}>
            <label>Person one<select name="a">{metPeople.map((id) => <option key={id} value={id}>{names[id]}</option>)}</select></label>
            <label>Person two<select name="b">{metPeople.map((id) => <option key={id} value={id}>{names[id]}</option>)}</select></label>
            <input name="note" maxLength={200} placeholder="Why they'd click (optional)" /><p></p><button className="primary">Send introduction</button>
          </form></details>}
        {pastDone.sort((a, b) => new Date(b.when) - new Date(a.when)).map((m) => <Match key={m.id} m={m} />)}
      </Sec>
    </main>
  );
}
