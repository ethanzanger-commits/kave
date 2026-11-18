import Nav from "../Nav";
import SubmitButton from "@/app/SubmitButton";
import { overlap } from "@/lib/avail";
import { missing, isFinished } from "@/lib/complete";
import { auth } from "@/auth";
import { db, client } from "@/db";
import Flair from "../Flair";
import Prompts from "../Prompts";
import { cityOf } from "@/lib/place";
import { winnerMap, isNewProfile, short } from "@/lib/leaders";
import { profiles, users, swipes, blocks, matches } from "@/schema";
import { eq, ne, or, sql, isNotNull, inArray, getTableColumns } from "drizzle-orm";
import { tierFor } from "@/lib/rewards";
import { redirect } from "next/navigation";
import { swipe, blockUser, toggleFree } from "../actions";
import { headers } from "next/headers";
import { gate } from "@/lib/gate";
import { score, why, learn } from "@/lib/match";
export default async function Discover() {
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent("/discover")); const me = s.user.id;
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const [meU] = await db.select().from(users).where(eq(users.id, me));
  if (missing(mine, meU?.image).length) redirect("/profile");
  const free = mine.freeUntil && mine.freeUntil > new Date();
  const g = await gate(me, s.user.email); const host = (await headers()).get("host");
  const seen = new Set((await db.select({ t: swipes.to }).from(swipes).where(eq(swipes.from, me))).map((x) => x.t));
  const { image: _i, ...uCols } = getTableColumns(users);
  const uLite = { ...uCols, hasImage: sql`(${users.image} is not null)`.mapWith(Boolean) };
  const all = (await db.select({ p: profiles, u: uLite }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(ne(profiles.userId, me)).limit(300)).filter((r) => isFinished(r.p, r.u.hasImage) && r.p.about);
  const bl = await db.select().from(blocks).where(or(eq(blocks.from, me), eq(blocks.to, me))); bl.forEach((b) => seen.add(b.from === me ? b.to : b.from));
  const near = all.filter((x) => x.p.neighborhood === mine.neighborhood).length;
  const inv = Object.fromEntries((await db.select({ u: profiles.invitedBy, c: sql`count(*)` }).from(profiles).where(isNotNull(profiles.invitedBy)).groupBy(profiles.invitedBy)).map((r) => [r.u, Number(r.c)]));
  const past = (await db.select().from(matches).where(or(eq(matches.a, me), eq(matches.b, me)))).filter((m) => m.met != null).map((m) => ({ id: m.a === me ? m.b : m.a, met: m.met }));
  const hp = past.length ? await db.select().from(profiles).where(inArray(profiles.userId, past.map((h) => h.id))) : [];
  const hist = past.map((h) => ({ met: h.met, p: hp.find((x) => x.userId === h.id) || {} }));
  const win = await winnerMap(client);
  const rank = (x) => (mine?.invitedBy && x.p.userId === mine.invitedBy ? 100 : 0) + score(mine, x.p) + learn(x.p, hist) + ((inv[x.p.userId] || 0) >= 5 ? 2 : 0) + (x.p.freeUntil && x.p.freeUntil > new Date() ? (free ? 4 : 2) : 0) + (overlap(mine, x.p).length ? 2 : 0) + ((win[x.p.userId] || []).length ? 6 : 0) + (isNewProfile(x.p) ? 2 : 0);
  const next = all.filter((x) => !seen.has(x.p.userId)).sort((a, b) => rank(b) - rank(a))[0];
  return (
    <main>
      <Nav />
      <p>{near} {near === 1 ? "person" : "people"} around {mine.neighborhood}.</p>
      <form action={toggleFree}><SubmitButton className={free ? "primary" : ""}>{free ? "You're free this week (tap to undo)" : "I'm free for coffee this week"}</SubmitButton></form>
      {g.locked ? <div className="card"><h2>Invite {g.need - g.invited} more to keep going</h2><p>You've used your {g.free} free coffee requests. <a href="/invite">Share your invite link</a> ({g.invited}/{g.need} joined)</p></div> : !next ? <p>You're all caught up. Invite people from My coffees to see more.</p> : (
        <article className="profile">
          <a className="photo" href={"/member/" + next.p.userId}>{next.u.hasImage ? <img src={`/api/avatar/${next.p.userId}?v=${+new Date(next.p.updatedAt)}`} alt={`Photo of ${short(next.u.name, next.u.email)}`} referrerPolicy="no-referrer" /> : <div className="avatar">{short(next.u.name, next.u.email)[0]}</div>}</a>
          <h2><a href={"/member/" + next.p.userId}>{short(next.u.name, next.u.email)}</a></h2>
          <p className="role">{[next.p.headline, next.p.company].filter(Boolean).join(" at ")}, {cityOf(next.p)}</p>
          <p><Flair cats={win[next.p.userId]} isNew={isNewProfile(next.p)} />{next.p.foundingNo && <span className="badge">Founding 50 #{next.p.foundingNo}</span>}{next.p.freeUntil && next.p.freeUntil > new Date() && <span className="chip">Free this week</span>}</p>
          {next.p.about && <p>{next.p.about}</p>}
          <Prompts p={next.p} />
          <p className="why">{why(mine, next.p)}{overlap(mine, next.p).length > 0 ? ` You're both free ${overlap(mine, next.p).join(", ")}.` : ""}</p>
          <div className="row">
            <form action={swipe.bind(null, next.p.userId, true)}><SubmitButton className="primary">Ask for a coffee</SubmitButton></form>
            <form action={swipe.bind(null, next.p.userId, false)}><SubmitButton>Not now</SubmitButton></form>
          </div>
          <p><small><a href={"/member/" + next.p.userId}>See full profile</a></small></p>
        </article>)}
    </main>
  );
}
