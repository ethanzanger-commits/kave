import Nav from "../Nav";
import { overlap } from "@/lib/avail";
import { missing } from "@/lib/complete";
import { auth } from "@/auth";
import { db, client } from "@/db";
import Flair from "../Flair";
import Prompts from "../Prompts";
import { cityOf } from "@/lib/place";
import { winnerMap, isNewProfile, short } from "@/lib/leaders";
import { profiles, users, swipes, blocks, matches } from "@/schema";
import { eq, ne, or, sql, isNotNull, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { swipe, toggleFree } from "../actions";
import { score, reasons, learn } from "@/lib/match";
import { trackOnce } from "@/lib/track";
export const metadata = { title: "Discover · Kave" };
const Photo = ({ u, size = 0, name }) => u.image
  ? <img src={u.image} alt={`Photo of ${name}`} referrerPolicy="no-referrer" {...(size ? { width: size, height: size } : {})} />
  : <div className="avatar">{name[0]}</div>;
export default async function Discover({ searchParams }) {
  const s = await auth(); if (!s?.user?.id) redirect("/"); const me = s.user.id;
  const view = (await searchParams)?.view === "dismissed" ? "dismissed" : "today";
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const [meU] = await db.select().from(users).where(eq(users.id, me));
  if (missing(mine, meU?.image).length) redirect("/profile");
  await trackOnce(me, "discover_viewed", 12);
  const free = mine.freeUntil && mine.freeUntil > new Date();
  const mySw = await db.select().from(swipes).where(eq(swipes.from, me));
  const seen = new Set(mySw.map((x) => x.to));
  const dismissedIds = new Set(mySw.filter((x) => !x.yes).map((x) => x.to));
  const bl = await db.select().from(blocks).where(or(eq(blocks.from, me), eq(blocks.to, me)));
  const blocked = new Set(bl.map((b) => (b.from === me ? b.to : b.from)));
  blocked.forEach((id) => seen.add(id));
  const all = (await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(ne(profiles.userId, me)).limit(300)).filter((r) => r.p.ageOk && r.p.about);
  const name = (r) => short(r.u.name, r.u.email);

  if (view === "dismissed") {
    const list = all.filter((r) => dismissedIds.has(r.p.userId) && !blocked.has(r.p.userId));
    return (
      <main className="wide">
        <Nav />
        <p className="kicker">Discover</p>
        <div className="tabs"><a href="/discover">Today</a><a href="/discover?view=dismissed" aria-current="page">Passed on</a></div>
        <h1 className="display" style={{ fontSize: "2.2rem" }}>People you passed on</h1>
        <p className="lead">Changed your mind? Anyone here can still be asked for a coffee.</p>
        {list.length === 0 ? <div className="empty"><b>Nobody here.</b> When you tap "Show me someone else", that person lands here instead of disappearing.</div> : (
          <ul className="people">{list.map((r) => (
            <li key={r.p.userId}>
              <a href={"/member/" + r.p.userId}><Photo u={r.u} size={64} name={name(r)} /></a>
              <div className="info">
                <h3><a href={"/member/" + r.p.userId}>{name(r)}</a></h3>
                <p>{[r.p.headline, cityOf(r.p)].filter(Boolean).join(", ")}</p>
                <form action={swipe.bind(null, r.p.userId, true)}><button>I'd like to meet</button></form>
              </div>
            </li>))}</ul>)}
      </main>
    );
  }

  const near = all.filter((x) => cityOf(x.p) && cityOf(x.p) === cityOf(mine)).length;
  const inv = Object.fromEntries((await db.select({ u: profiles.invitedBy, c: sql`count(*)` }).from(profiles).where(isNotNull(profiles.invitedBy)).groupBy(profiles.invitedBy)).map((r) => [r.u, Number(r.c)]));
  const past = (await db.select().from(matches).where(or(eq(matches.a, me), eq(matches.b, me)))).filter((m) => m.met != null).map((m) => ({ id: m.a === me ? m.b : m.a, met: m.met }));
  const hp = past.length ? await db.select().from(profiles).where(inArray(profiles.userId, past.map((h) => h.id))) : [];
  const hist = past.map((h) => ({ met: h.met, p: hp.find((x) => x.userId === h.id) || {} }));
  const win = await winnerMap(client);
  const rank = (x) => score(mine, x.p) + learn(x.p, hist) + ((inv[x.p.userId] || 0) >= 5 ? 2 : 0) + (x.p.freeUntil && x.p.freeUntil > new Date() ? (free ? 4 : 2) : 0) + (overlap(mine, x.p).length ? 2 : 0) + ((win[x.p.userId] || []).length ? 6 : 0) + (isNewProfile(x.p) ? 2 : 0);
  const queue = all.filter((x) => !seen.has(x.p.userId)).sort((a, b) => rank(b) - rank(a));
  const [pick, ...rest] = queue; const more = rest.slice(0, 3);
  const dismissedCount = [...dismissedIds].filter((id) => !blocked.has(id) && all.some((r) => r.p.userId === id)).length;
  const common = pick ? overlap(mine, pick.p) : [];
  const why = pick ? reasons(mine, pick.p) : [];
  return (
    <main className="wide">
      <Nav />
      <p className="kicker">Discover</p>
      <div className="tabs"><a href="/discover" aria-current="page">Today</a><a href="/discover?view=dismissed">Passed on{dismissedCount > 0 ? ` (${dismissedCount})` : ""}</a></div>
      <p className="meta" style={{ marginTop: 0 }}>{near} {near === 1 ? "person" : "people"} in {cityOf(mine) || "your city"}. <a href="/around">Browse everyone</a></p>
      <form action={toggleFree}><button className={free ? "primary" : ""}>{free ? "You're free this week (tap to undo)" : "I'm free for coffee this week"}</button></form>
      {!pick ? (
        <div className="empty" style={{ marginTop: "1.2rem" }}><b>You're all caught up.</b> New people join every week. In the meantime you can <a href="/discover?view=dismissed">revisit people you passed on</a>, <a href="/around">browse everyone</a>, or <a href="/invite">invite someone you'd like to see here</a>.</div>
      ) : (
        <article className="profile split" style={{ marginTop: "1.2rem" }}>
          <a className="photo" href={"/member/" + pick.p.userId}><Photo u={pick.u} name={name(pick)} /></a>
          <div className="body">
            <p className="pick">Your Kave pick today</p>
            <h2 className="display" style={{ fontSize: "2.2rem", marginTop: 0 }}><a href={"/member/" + pick.p.userId}>{name(pick)}</a></h2>
            <p className="role">{[pick.p.headline, pick.p.company].filter(Boolean).join(" at ")}</p>
            <p className="meta" style={{ marginTop: 0 }}>{[cityOf(pick.p), pick.p.industry].filter(Boolean).join(" · ")}</p>
            <p><Flair cats={win[pick.p.userId]} isNew={isNewProfile(pick.p)} />{pick.p.freeUntil && pick.p.freeUntil > new Date() && <span className="chip">Free this week</span>}</p>
            {(pick.p.skills || []).length > 0 && <p>{pick.p.skills.slice(0, 6).map((x) => <span className="chip" key={x}>{x}</span>)}</p>}
            <Prompts p={pick.p} />
            <section className="reasons" aria-label="Why you two should meet">
              <h3>Why you two should meet</h3>
              {why.length === 0 && common.length === 0
                ? <p style={{ margin: 0 }}>You don't overlap on anything yet, which is the point: this is someone outside your usual circle.</p>
                : <dl>{why.map((r) => <div key={r.k}><dt>{r.k}</dt><dd>{r.t}</dd></div>)}{common.length > 0 && <div><dt>Both free</dt><dd>{common.join(", ")}.</dd></div>}</dl>}
            </section>
            <div className="row">
              <form action={swipe.bind(null, pick.p.userId, true)}><button className="primary">I'd like to meet</button></form>
              <form action={swipe.bind(null, pick.p.userId, false)}><button>Show me someone else</button></form>
            </div>
            <p className="hint">If it's a yes from both of you, you'll choose a public café together. Someone else is never told you passed.</p>
            <p><small><a href={"/member/" + pick.p.userId}>See full profile</a></small></p>
          </div>
        </article>)}
      {more.length > 0 && <>
        <div className="section-h"><h2>More people worth meeting</h2><small><a href="/around">See everyone</a></small></div>
        <ul className="people">{more.map((r) => { const rs = reasons(mine, r.p); return (
          <li key={r.p.userId}>
            <a href={"/member/" + r.p.userId}><Photo u={r.u} size={64} name={name(r)} /></a>
            <div className="info">
              <h3><a href={"/member/" + r.p.userId}>{name(r)}</a></h3>
              <p>{[r.p.headline, cityOf(r.p)].filter(Boolean).join(", ")}</p>
              {rs[0] && <p className="hint">{rs[0].t}</p>}
              <form action={swipe.bind(null, r.p.userId, true)}><button>I'd like to meet</button></form>
            </div>
          </li>); })}</ul></>}
    </main>
  );
}
