import { auth } from "@/auth";
import { db, client } from "@/db";
import { profiles, users, swipes, matches } from "@/schema";
import { and, eq, or } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Nav from "../../Nav";
import Flair from "../../Flair";
import Prompts from "../../Prompts";
import { swipe, blockUser, toggleSave } from "../../actions";
import { winnerMap, isNewProfile, short } from "@/lib/leaders";
import { why } from "@/lib/match";
import { overlap, AVAIL } from "@/lib/avail";
import { cityOf } from "@/lib/place";
import { endorsementsFor } from "@/lib/social";
export async function generateMetadata() { return { title: "Member · Kave", robots: { index: false } }; }
export default async function Member({ params }) {
  const { id } = await params;
  const s = await auth(); if (!s?.user?.id) redirect("/"); const me = s.user.id;
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, id));
  const [u] = await db.select().from(users).where(eq(users.id, id));
  if (!p || !p.ageOk || !u) notFound();
  const [mine] = await db.select().from(profiles).where(eq(profiles.userId, me));
  const mineSw = (await db.select().from(swipes).where(and(eq(swipes.from, me), eq(swipes.to, id))))[0];
  const theirSw = (await db.select().from(swipes).where(and(eq(swipes.from, id), eq(swipes.to, me))))[0];
  const [m] = await db.select().from(matches).where(or(and(eq(matches.a, me), eq(matches.b, id)), and(eq(matches.a, id), eq(matches.b, me))));
  const win = await winnerMap(client);
  const endorse = await endorsementsFor(client, id).catch(() => []);
  const [sv] = await client`select 1 as x from saved where "userId" = ${me} and "targetId" = ${id}`.catch(() => []);
  const labels = Object.fromEntries(AVAIL);
  const common = overlap(mine || {}, p);
  const name = short(u.name, u.email);
  const freeNow = p.freeUntil && p.freeUntil > new Date();
  const avail = (p.availability || []).map((k) => (labels[k] || "").toLowerCase()).filter(Boolean);
  const first = name.split(" ")[0];
  const quiet = { style: { display: "inline" } };
  return (
    <main className="wide">
      <Nav />
      <article className="profile split">
        <div className="photo">{u.image ? <img src={u.image} alt={`Photo of ${name}`} referrerPolicy="no-referrer" className="portrait" /> : <div className="avatar">{name[0]}</div>}</div>
        <div className="body">
          <p className="kicker">{[p.industry, cityOf(p)].filter(Boolean).join(" · ") || "Member"}</p>
          <h1 className="display" style={{ marginTop: 0 }}>{name}</h1>
          <p className="role">{[p.headline, p.company].filter(Boolean).join(" at ")}</p>
          <p><Flair cats={win[id]} isNew={isNewProfile(p)} />{p.foundingNo && <span className="badge">Founding 50 #{p.foundingNo}</span>}{freeNow && <span className="chip">Free this week</span>}</p>
          {p.about && <p style={{ fontSize: "1.1rem", maxWidth: "36rem" }}>{p.about}</p>}
          <Prompts p={p} />
          {endorse.length > 0 && <section><h2>What people say</h2>{endorse.map((e, i) => <p key={i}>&ldquo;{e.text}&rdquo; <small>{short(e.name, e.email)}</small></p>)}</section>}
          {(p.skills || []).length > 0 && <p>{p.skills.slice(0, 8).map((x) => <span className="chip" key={x}>{x}</span>)}</p>}
          {avail.length > 0 && <p className="meta">Usually free for coffee {avail.join(", ")}.</p>}
          {id !== me && <p className="why"><b>Why you two?</b> {why(mine || {}, p)}{common.length > 0 ? ` You're both free ${common.join(", ")}.` : ""}</p>}
          {id === me ? <p><a href="/profile">Edit your profile</a></p>
            : m ? <a className="cta" href="/matches">You're matched. Open your coffee</a>
            : mineSw?.yes ? <p className="why">You've asked {first} for a coffee. We'll email you when they reply.</p>
            : theirSw?.yes && !mineSw ? <div className="ask"><h2>{first} would like a coffee with you</h2><p>Say yes and you can pick a café and a time together.</p><div className="row"><form action={swipe.bind(null, id, true)}><button className="primary">Accept</button></form><form action={swipe.bind(null, id, false)}><button>Not now</button></form></div></div>
            : <div className="ask"><h2>Ask {first} for a coffee</h2><p>They will see your request and can say yes or not now. If it's a yes, you choose a public café together.</p><div className="row"><form action={swipe.bind(null, id, true)}><button className="primary">Ask for a coffee</button></form><form action={swipe.bind(null, id, false)}><button>Not now</button></form></div></div>}
          {id !== me && <form action={toggleSave.bind(null, id)}><button>{sv ? "Saved. Tap to remove" : "Save for later"}</button></form>}
          {id !== me && <div className="meta"><form action={blockUser.bind(null, id, "report")} {...quiet}><button className="linkbtn">Report</button></form>{" or "}<form action={blockUser.bind(null, id, "block")} {...quiet}><button className="linkbtn">block this member</button></form></div>}
        </div>
      </article>
    </main>
  );
}
