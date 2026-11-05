import { auth } from "@/auth";
import { db } from "@/db";
import { profiles, users, swipes } from "@/schema";
import { eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { swipe } from "../actions";
import { headers } from "next/headers";
import { gate } from "@/lib/gate";
import { score, why } from "@/lib/match";
export default async function Discover() {
  const s = await auth(); if (!s) redirect("/"); const me = s.user.id;
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  if (!mine?.neighborhood) redirect("/profile");
  const g = await gate(me, s.user.email); const host = (await headers()).get("host");
  const seen = new Set((await db.select({ t: swipes.to }).from(swipes).where(eq(swipes.from, me))).map((x) => x.t));
  const all = await db.select({ p: profiles, u: users }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(ne(profiles.userId, me)).limit(300);
  const near = all.filter((x) => x.p.neighborhood === mine.neighborhood).length;
  const next = all.filter((x) => !seen.has(x.p.userId)).sort((a, b) => score(mine, b.p) - score(mine, a.p))[0];
  return (
    <main>
      <nav><a href="/profile">Profile</a><a href="/matches">My coffees</a><a href="/around">Who's around</a></nav>
      <p>{near} {near === 1 ? "person" : "people"} around {mine.neighborhood}.</p>
      {g.locked ? <div className="card"><h2>Invite {g.need - g.invited} more to keep going</h2><p>You've used your 3 free coffee requests. Share this link: {host}/join?ref={mine.refCode} ({g.invited}/{g.need} joined)</p></div> : !next ? <p>You're all caught up. Invite people from My coffees to see more.</p> : (
        <div className="card">
          <h2>{next.u.name}</h2><p>{next.p.headline} · {next.p.neighborhood}</p>
          <p><b>Why you two?</b> {why(mine, next.p)}</p>
          <div className="row">
            <form action={swipe.bind(null, next.p.userId, false)}><button>Skip</button></form>
            <form action={swipe.bind(null, next.p.userId, true)}><button className="primary">Coffee?</button></form>
          </div>
        </div>)}
    </main>
  );
}
