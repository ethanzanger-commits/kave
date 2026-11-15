import Nav from "../Nav";
import { overlap } from "@/lib/avail";
import { missing } from "@/lib/complete";
import { auth } from "@/auth";
import { db, client } from "@/db";
import Flair from "../Flair";
import { winnerMap, isNewProfile, short } from "@/lib/leaders";
import { profiles, users, swipes, blocks, matches } from "@/schema";
import { eq, ne, or, sql, isNotNull, inArray } from "drizzle-orm";
import { tierFor } from "@/lib/rewards";
import { redirect } from "next/navigation";
import { swipe, blockUser, toggleFree } from "../actions";
import { headers } from "next/headers";
import { gate } from "@/lib/gate";
import { score, why, learn } from "@/lib/match";
export default async function Discover() {
  const s = await auth(); if (!s?.user?.id) redirect("/"); const me = s.user.id;
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const [meU] = await db.select().from(users).where(eq(users.id, me));
  if (missing(mine, meU?.image).length) redirect("/profile");
  const free = mine.freeUntil && mine.freeUntil > new Date();
  const g = await gate(me, s.user.email); const host = (await headers()).get("host");
  const seen = new Set((await db.select({ t: swipes.to }).from(swipes).where(eq(swipes.from, me))).map((x) => x.t));
  const all = (await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(ne(profiles.userId, me)).limit(300)).filter((r) => r.p.ageOk && r.p.about);
  const bl = await db.select().from(blocks).where(or(eq(blocks.from, me), eq(blocks.to, me))); bl.forEach((b) => seen.add(b.from === me ? b.to : b.from));
  const near = all.filter((x) => x.p.neighborhood === mine.neighborhood).length;
  const inv = Object.fromEntries((await db.select({ u: profiles.invitedBy, c: sql`count(*)` }).from(profiles).where(isNotNull(profiles.invitedBy)).groupBy(profiles.invitedBy)).map((r) => [r.u, Number(r.c)]));
  const past = (await db.select().from(matches).where(or(eq(matches.a, me), eq(matches.b, me)))).filter((m) => m.met != null).map((m) => ({ id: m.a === me ? m.b : m.a, met: m.met }));
  const hp = past.length ? await db.select().from(profiles).where(inArray(profiles.userId, past.map((h) => h.id))) : [];
  const hist = past.map((h) => ({ met: h.met, p: hp.find((x) => x.userId === h.id) || {} }));
  const win = await winnerMap(client);
  const rank = (x) => score(mine, x.p) + learn(x.p, hist) + ((inv[x.p.userId] || 0) >= 5 ? 2 : 0) + (x.p.freeUntil && x.p.freeUntil > new Date() ? (free ? 4 : 2) : 0) + (overlap(mine, x.p).length ? 2 : 0) + ((win[x.p.userId] || []).length ? 6 : 0) + (isNewProfile(x.p) ? 2 : 0);
  const next = all.filter((x) => !seen.has(x.p.userId)).sort((a, b) => rank(b) - rank(a))[0];
  return (
    <main>
      <Nav />
      <p>{near} {near === 1 ? "person" : "people"} around {mine.neighborhood}.</p>
      <form action={toggleFree}><button className={free ? "primary" : ""}>{free ? "You're free this week (tap to undo)" : "I'm free for coffee this week"}</button></form>
      {g.locked ? <div className="card"><h2>Invite {g.need - g.invited} more to keep going</h2><p>You've used your {g.free} free coffee requests. <a href="/invite">Share your invite link</a> ({g.invited}/{g.need} joined)</p></div> : !next ? <p>You're all caught up. Invite people from My coffees to see more.</p> : (
        <div className="card">
          {next.u.image ? <img src={next.u.image} alt="" width="96" height="96" referrerPolicy="no-referrer" style={{ borderRadius: "50%" }} /> : <div className="avatar">{(next.u.name || "?")[0]}</div>}
          <h2>{short(next.u.name, next.u.email)}</h2><Flair cats={win[next.p.userId]} isNew={isNewProfile(next.p)} />{next.p.foundingNo && <span className="badge"><img className="badgeimg" src="/badges/founding-50.svg" alt="" width="20" height="20" /> Founding 50 #{next.p.foundingNo}</span>}{tierFor(inv[next.p.userId] || 0) && <span className="badge"><img className="badgeimg" src={`/badges/${tierFor(inv[next.p.userId] || 0).slug}.svg`} alt="" width="20" height="20" /> {tierFor(inv[next.p.userId] || 0).name}</span>}<p>{next.p.headline} · {next.p.neighborhood}</p>
          {next.p.about && <p>{next.p.about}</p>}
          {next.p.lookingFor && <p><b>Looking for:</b> {next.p.lookingFor}</p>}
          {next.p.canHelp && <p><b>Can help with:</b> {next.p.canHelp}</p>}
          <p>{next.p.freeUntil && next.p.freeUntil > new Date() && <span className="chip" style={{ background: "#ffe3a3" }}>Free this week{free ? " (you too!)" : ""}</span>}{(next.p.skills || []).slice(0, 5).map((x) => <span className="chip" key={x}>{x}</span>)}</p>
          <p className="why"><b>Why you two?</b> {why(mine, next.p)}</p>
          {overlap(mine, next.p).length > 0 && <p style={{ margin: 0 }}>Both available: {overlap(mine, next.p).join(", ")}.</p>}
          <div className="row"><form action={blockUser.bind(null, next.p.userId, "block")}><button>Block</button></form><form action={blockUser.bind(null, next.p.userId, "report")}><button>Report</button></form></div>
          <div className="row">
            <form action={swipe.bind(null, next.p.userId, false)}><button>Maybe later</button></form>
            <form action={swipe.bind(null, next.p.userId, true)}><button className="primary">Coffee?</button></form>
          </div>
        </div>)}
    </main>
  );
}
