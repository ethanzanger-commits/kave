import { auth } from "@/auth";
import { db, client } from "@/db";
import Flair from "../Flair";
import { winnerMap, isNewProfile, short } from "@/lib/leaders";
import { profiles, users, swipes, blocks } from "@/schema";
import { eq, ne, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { gate } from "@/lib/gate";
import { missing } from "@/lib/complete";
import { swipe } from "../actions";
import Nav from "../Nav";
import { cityOf } from "@/lib/place";
import { AVAIL } from "@/lib/avail";
export default async function Around({ searchParams }) {
  const s = await auth(); if (!s?.user?.id) redirect("/"); const me = s.user.id;
  const hood = (await searchParams)?.hood || "", av = (await searchParams)?.avail || "";
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const [meU] = await db.select().from(users).where(eq(users.id, me));
  if (missing(mine, meU?.image).length) redirect("/profile");
  const g = await gate(me, s.user.email);
  const seen = new Set((await db.select({ t: swipes.to }).from(swipes).where(eq(swipes.from, me))).map((x) => x.t));
  (await db.select().from(blocks).where(or(eq(blocks.from, me), eq(blocks.to, me)))).forEach((b) => seen.add(b.from === me ? b.to : b.from));
  const rows = (await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(ne(profiles.userId, me)).limit(300)).filter((r) => r.p.ageOk);
  const hoods = {}; rows.forEach((r) => { const h = cityOf(r.p) || "Somewhere"; hoods[h] = (hoods[h] || 0) + 1; });
  const isFree = (r) => r.p.freeUntil && r.p.freeUntil > new Date();
  const win = await winnerMap(client);
  const isNew = (r) => isNewProfile(r.p);
  const pr = (r) => ((win[r.p.userId] || []).length ? 4 : 0) + (isNew(r) ? 2 : 0) + (isFree(r) ? 1 : 0);
  const list = rows.filter((r) => !seen.has(r.p.userId) && (!hood || cityOf(r.p) === hood) && (!av || (r.p.availability || []).includes(av) || (r.p.availability || []).includes("flexible"))).sort((a, b) => pr(b) - pr(a)).slice(0, 20);
  return (
    <main>
      <Nav />
      <h1>Who's around</h1>
      <p className="lead">{rows.length} {rows.length === 1 ? "person is" : "people are"} on kave. Tap Coffee? on anyone you'd like to meet, or use <a href="/discover">Discover</a> to go one at a time.</p>
      {list.some(isNew) && <p className="why"><b>Who's new:</b> {list.filter(isNew).length} joined this week and show first.</p>}
      <p><a className="chip" href="/around">All</a>{Object.entries(hoods).map(([h, c]) => <a className="chip" key={h} href={"/around?hood=" + encodeURIComponent(h)}>{h} · {c}</a>)}</p>
      <p>{AVAIL.map(([k, l]) => <a className="chip cafe" key={k} href={"/around?" + (hood ? "hood=" + encodeURIComponent(hood) + "&" : "") + "avail=" + k}>{l}</a>)}</p>
      {!g.open ? (
        <div className="card"><h2>Names unlock with {g.need} friends</h2><p>You can see where people are. Names appear once {g.need} friends join through your link ({g.invited}/{g.need} so far).</p><a href="/invite">Get your invite link</a></div>
      ) : list.length === 0 ? (
        <div className="card"><p>Nobody new here right now. Invite friends so there are more people to meet.</p><a href="/invite">Get your invite link</a></div>
      ) : list.map((r) => (
        <div className="card" key={r.p.userId}>
          <div className="who">
            {r.u.image ? <img src={r.u.image} alt="" width="56" height="56" referrerPolicy="no-referrer" /> : <div className="avatar" style={{ width: 56, height: 56, fontSize: "1.4rem" }}>{(r.u.name || "?")[0]}</div>}
            <div><h2 style={{ fontSize: "1.2rem" }}>{short(r.u.name, r.u.email)}</h2><div>{r.p.headline}</div></div>
          </div>
          <p style={{ margin: ".6rem 0" }}><Flair cats={win[r.p.userId]} isNew={isNew(r)} /><span className="chip cafe">{cityOf(r.p)}</span>{isFree(r) && <span className="chip" style={{ background: "#ffe3a3" }}>Free this week</span>}{(r.p.skills || []).slice(0, 3).map((x) => <span className="chip" key={x}>{x}</span>)}</p>
          <form action={swipe.bind(null, r.p.userId, true)}><button className="primary">Coffee?</button></form>
        </div>))}
    </main>
  );
}
