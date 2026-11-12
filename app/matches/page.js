import Nav from "../Nav";
import { short } from "@/lib/leaders";
import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, users, matches, thanks, messages, intros, swipes } from "@/schema";
import { eq, or, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { schedule, blockUser, checkIn, sendThanks, respond, sendMessage, makeIntro, answerIntro, swipe } from "../actions";
import BookForm from "../BookForm";
import { starters } from "@/lib/match";
import { cafePins } from "@/lib/cafes";
import { fmt, gcal } from "@/lib/fmt";
export default async function Matches() {
  const s = await auth(); if (!s?.user?.id) redirect("/"); const me = s.user.id;
  const ms = await db.select().from(matches).where(or(eq(matches.a, me), eq(matches.b, me)));
  const ids = ms.map((m) => (m.a === me ? m.b : m.a));
  const others = ids.length ? await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(inArray(profiles.userId, ids)) : [];
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const th = ms.length ? await db.select().from(thanks).where(inArray(thanks.matchId, ms.map((x) => x.id))) : [];
  const msgs = ms.length ? await db.select().from(messages).where(inArray(messages.matchId, ms.map((x) => x.id))) : [];
  const ints = (await db.select().from(intros).where(or(eq(intros.a, me), eq(intros.b, me)))).filter((i) => (i.a === me ? i.aYes : i.bYes) == null);
  const metPeople = ms.filter((x) => x.met === true).map((x) => (x.a === me ? x.b : x.a));
  const sw = await db.select().from(swipes).where(or(eq(swipes.from, me), eq(swipes.to, me)));
  const matched = new Set(ms.map((x) => (x.a === me ? x.b : x.a)));
  const incoming = sw.filter((x) => x.to === me && x.yes && !sw.some((y) => y.from === me && y.to === x.from));
  const outgoing = sw.filter((x) => x.from === me && x.yes && !matched.has(x.to));
  const nameIds = [...new Set([...ints.flatMap((i) => [i.byId, i.a, i.b]), ...metPeople, ...incoming.map((x) => x.from), ...outgoing.map((x) => x.to)])];
  const names = nameIds.length ? Object.fromEntries((await db.select().from(users).where(inArray(users.id, nameIds))).map((u) => [u.id, short(u.name, u.email)])) : {};
  const pins = await cafePins(mine?.neighborhood);
  const near = pins.pins.map((x) => x.name).slice(0, 6);
  const invited = (await db.select({ id: profiles.userId }).from(profiles).where(eq(profiles.invitedBy, me))).length;
  const host = (await headers()).get("host");
  return (
    <main>
      <Nav />
      <h1>My coffees</h1>
      <p>{ms.length} matches · {ms.filter((m) => m.when && m.status !== "proposed").length} coffees booked · {ms.filter((x) => x.met === true).length} coffees had · {invited} friends invited</p>
      {near.length > 0 && <p>Cafés near {mine.neighborhood}: {near.join(", ")}. <small>Map data © OpenStreetMap contributors</small></p>}
      <datalist id="cafes">{near.map((c) => <option key={c} value={c} />)}</datalist>
      <p>Your invite link: <b>{host}/join?ref={mine?.refCode}</b> · <a href={`https://wa.me/?text=${encodeURIComponent("Join me on kave: https://" + host + "/join?ref=" + mine?.refCode)}`}>Share on WhatsApp</a></p>
      {incoming.length > 0 && <div className="card"><h2>Coffee requests</h2>{incoming.map((x) => <div key={x.from} style={{ margin: ".6rem 0" }}><p style={{ margin: 0 }}><b>{names[x.from] || "Someone"}</b> would like to grab coffee.</p>
        <div className="row"><form action={swipe.bind(null, x.from, true)}><button className="primary">Accept</button></form><form action={swipe.bind(null, x.from, false)}><button>Decline</button></form></div></div>)}</div>}
      {outgoing.length > 0 && <p>Waiting on a reply from: {outgoing.map((x) => names[x.to] || "someone").join(", ")}</p>}
      {ints.map((i) => { const other = i.a === me ? i.b : i.a; return (
        <div className="card" key={i.id}><h2>Introduction</h2>
          <p>{names[i.byId]} thinks you'd get on with <b>{names[other]}</b>.{i.note ? ` "${i.note}"` : ""}</p>
          <div className="row"><form action={answerIntro}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="yes" value="1" /><button className="primary">Yes, intro us</button></form>
            <form action={answerIntro}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="yes" value="0" /><button>Pass</button></form></div></div>); })}
      {metPeople.length > 1 && <details className="card"><summary><b>Introduce two people you've met</b></summary>
        <form action={makeIntro}>
          <label>Person one<select name="a">{metPeople.map((id) => <option key={id} value={id}>{names[id]}</option>)}</select></label>
          <label>Person two<select name="b">{metPeople.map((id) => <option key={id} value={id}>{names[id]}</option>)}</select></label>
          <input name="note" maxLength={200} placeholder="Why they'd click (optional)" /><p></p><button className="primary">Send introduction</button>
        </form></details>}
      {ms.length === 0 && <p>No matches yet. Say Coffee? to a few people on Discover.</p>}
      {ms.map((m) => {
        const o = others.find((x) => x.p.userId === (m.a === me ? m.b : m.a)); if (!o) return null;
        return (
          <div className="card" key={m.id}>
            {o.u.image ? <img src={o.u.image} alt="" width="56" height="56" referrerPolicy="no-referrer" style={{ borderRadius: "50%" }} /> : <div className="avatar">{(o.u.name || "?")[0]}</div>}
            <h2>{short(o.u.name, o.u.email)}</h2><p>{o.p.headline}</p>{o.p.about && <p>{o.p.about}</p>}
            {o.p.lookingFor && <p><b>Looking for:</b> {o.p.lookingFor}</p>}
            {o.p.canHelp && <p><b>Can help with:</b> {o.p.canHelp}</p>}
            <div className="row"><form action={blockUser.bind(null, o.p.userId, "block")}><button>Block</button></form><form action={blockUser.bind(null, o.p.userId, "report")}><button>Report</button></form></div>
            <div>
              {msgs.filter((x) => x.matchId === m.id).sort((x, y) => x.at - y.at).slice(-5).map((x) => <p key={x.id} className={x.fromId === me ? "" : "why"} style={{ margin: ".3rem 0" }}><b>{x.fromId === me ? "You" : short(o.u.name, o.u.email)}:</b> {x.text}</p>)}
              <form action={sendMessage}><input type="hidden" name="id" value={m.id} /><input name="text" maxLength={500} placeholder="Say hi, one line" required /><p></p><button>Send</button></form>
            </div>
            <p><b>Topics to get you talking</b></p><ul>{starters(mine, o.p).map((q) => <li key={q}>{q}</li>)}</ul>
            {m.when && m.status !== "proposed" ? <>
              <p>Booked: {fmt(m.when)} at {m.place}. <a href={`/card/${m.id}`}>Coffee card</a>{" · "}<a href={`/coffee/${m.id}`}>Cheat sheet</a>{" · "}
                <a href={`https://wa.me/?text=${encodeURIComponent("Coffee booked on kave https://" + host + "/card/" + m.id)}`}>WhatsApp</a>
                {gcal(m) && <>{" · "}<a href={gcal(m)}>Add to calendar</a></>}</p>
              {m.place && <><iframe title={"Map of " + m.place} src={"https://www.google.com/maps?q=" + encodeURIComponent(m.place + " " + (mine?.neighborhood || "")) + "&output=embed"} width="100%" height="200" loading="lazy" style={{ border: 0, borderRadius: 16 }} referrerPolicy="no-referrer-when-downgrade" />
                <p><a href={"https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(m.place + " " + (mine?.neighborhood || ""))} target="_blank" rel="noopener noreferrer">Get directions</a></p></>}
              {new Date(m.when) > new Date() && <form action={respond}><input type="hidden" name="id" value={m.id} /><button name="a" value="cancel">Cancel this coffee</button></form>}
              {m.met == null && new Date(m.when) < new Date() && <form action={checkIn}><input type="hidden" name="id" value={m.id} /><p>Did it happen?</p>
                <button name="met" value="yes">Yes, we met</button><button name="met" value="no">It didn't happen</button></form>}
              {m.met === true && <>
                {th.filter((x) => x.fromId !== me).map((x) => <p className="why" key={x.fromId}>{x.text}</p>)}
                {!th.some((x) => x.fromId === me) && <form action={sendThanks}><input type="hidden" name="id" value={m.id} /><input name="text" maxLength={140} placeholder="Say thanks in one line" required /><button>Send thanks</button></form>}
              </>}
              {m.met === false && <p>Thanks for checking in.</p>}
            </> : (
              <>{m.status === "proposed" && <div className="why"><p style={{ margin: 0 }}>{m.proposedBy === me ? "Waiting for them to accept" : "They proposed"}: {fmt(m.when)} at {m.place}</p>
                <form action={respond}><input type="hidden" name="id" value={m.id} />{m.proposedBy !== me && <button name="a" value="accept" className="primary">Accept</button>}<button name="a" value="cancel">{m.proposedBy === me ? "Cancel" : "Decline"}</button></form></div>}
                <BookForm id={m.id} cafes={near} schedule={schedule} hood={mine?.neighborhood} center={pins.center} pins={pins.pins} /></>)}
          </div>);
      })}
    </main>
  );
}
