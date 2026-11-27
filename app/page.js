import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db, client } from "@/db";
import { profiles, users } from "@/schema";
import { eq } from "drizzle-orm";
import { communityStats } from "@/lib/community";
import { homeFaces } from "@/lib/social";
import { short } from "@/lib/leaders";
import { trackAnon } from "@/lib/track";
export default async function Home() {
  if ((await auth())?.user?.id) redirect("/discover");
  const stats = await communityStats(client);
  const faces = await homeFaces(client).catch(() => []);
  const ref = (await cookies()).get("ref")?.value; let from = null;
  if (ref) { const [r] = await db.select({ n: users.name }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(eq(profiles.refCode, ref)); from = r?.n?.split(" ")[0]; }
  const go = (p) => async () => { "use server"; await trackAnon("signup_started", { method: p }); await signIn(p, { redirectTo: "/profile" }); };
  const Signup = ({ id }) => (
    <div id={id === "email" ? "join" : undefined}>
      {process.env.AUTH_LINKEDIN_ID && <form action={go("linkedin")}><button className="primary">Continue with LinkedIn</button></form>}
      {process.env.AUTH_GOOGLE_ID && <form action={go("google")}><button>Continue with Google</button></form>}
      <form action={async (fd) => { "use server"; await trackAnon("signup_started", { method: "email" }); await signIn("nodemailer", { email: fd.get("email"), redirectTo: "/profile" }); }}>
        <label htmlFor={id}>Your email</label>
        <input id={id} name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        <p></p><button className={process.env.AUTH_LINKEDIN_ID ? undefined : "primary"}>Find your next coffee</button>
        <p className="hint">Free for members. We email you a sign-in link, no password.</p>
      </form>
    </div>
  );
  return (
    <main className="wide">
      <p className="logo">kave<span>.</span></p>
      {from && <p className="why"><b>{from} invited you.</b> Join and you both get a head start.</p>}
      <div className="hero">
        <div>
          <p className="kicker">Coffee for professionals in Israel</p>
          <h1 className="display">Your next great professional connection isn't in your network. Yet.</h1>
          <p className="lead">Kave introduces you to interesting professionals across Israel, based on what you do, what you're working on, and what you can learn from each other.</p>
          <Signup id="email" />
          <p><a className="cta" href="#how" style={{ background: "transparent", color: "var(--ink)", border: "1px solid var(--ink)" }}>How it works</a></p>
        </div>
        <div>
          <div className="example"><span className="tag">An example introduction (illustrative)</span>
            <p>You both know product design, and they can help with hiring your first engineer.</p>
            <p className="hint" style={{ font: "inherit", fontSize: ".85rem" }}>Every introduction on Kave says why two people should meet, drawn from what they've shared on their profiles.</p></div>
          {faces.length >= 3 && <section><h2>Some of the people on Kave</h2><ul className="faces">{faces.map((f) => <li key={f.id}><img src={"/api/photo/" + f.id} alt="" width="120" height="150" loading="lazy" /><b>{short(f.name, f.email)}</b><small>{f.headline}</small></li>)}</ul></section>}
        </div>
      </div>
      <section id="how"><h2>How it works</h2>
        <ol className="steps2">
          <li><span><b>Tell us a little about you.</b> Name, photo, city, what you do. A CV can fill in the rest. It takes about two minutes.</span></li>
          <li><span><b>See who you should meet, and why.</b> Each introduction shows what you have in common and what you could learn from each other.</span></li>
          <li><span><b>Pick a café and a time.</b> When you both say yes, you choose a public café and go. No feeds, no pitching.</span></li>
        </ol>
      </section>
      {stats.count > 0 && <section><h2>The community</h2><p className="count"><b>{stats.count}</b> {stats.count === 1 ? "professional has" : "professionals have"} joined Kave so far.</p></section>}
      <section className="card"><h2>Ready for a good conversation?</h2><p className="lead" style={{ marginBottom: ".6rem" }}>Kave is free for individual members.</p><Signup id="email2" /></section>
      <p><small><a href="/how-to">More on how it works</a> · <a href="/contact">Contact</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></small></p>
    </main>
  );
}
