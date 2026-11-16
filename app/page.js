import { auth, signIn } from "@/auth";
import SubmitButton from "@/app/SubmitButton";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db, client } from "@/db";
import { profiles, users } from "@/schema";
import { eq } from "drizzle-orm";
import { communityStats } from "@/lib/community";
import { recordIntent } from "@/lib/attribution";
import { homeFaces } from "@/lib/social";
import { short } from "@/lib/leaders";
import { verifyTurnstile } from "@/lib/turnstile";
import { hit } from "@/lib/limit";
import Turnstile from "./Turnstile";
import { headers } from "next/headers";
export default async function Home({ searchParams }) {
  const sp = (await searchParams) || {};
  if ((await auth())?.user?.id) redirect("/profile");
  const stats = await communityStats(client);
  const faces = await homeFaces(client).catch(() => []);
  const ref = (await cookies()).get("ref")?.value; let from = null;
  if (ref) { const [r] = await db.select({ n: users.name }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(eq(profiles.refCode, ref)); from = r?.n?.split(" ")[0]; }
  const go = (p) => async () => { "use server"; await signIn(p, { redirectTo: "/profile" }); };
  return (
    <main className="wide">
      <p className="logo">kave<span>.</span></p>
      {from && <p className="why"><b>{from} invited you.</b> Join and you both get a head start.</p>}
      <div className="hero">
        <div>
          <p className="kicker">Coffee for professionals in Israel</p>
          <h1 className="display">Meet someone worth knowing.</h1>
          <p className="lead">Kave shows you why two people should meet. You pick a café, and you go. No feeds, no pitching.</p>
        {process.env.AUTH_LINKEDIN_ID && <form action={go("linkedin")}><SubmitButton className="primary">Continue with LinkedIn</SubmitButton></form>}
        {process.env.AUTH_GOOGLE_ID && <form action={go("google")}><SubmitButton>Continue with Google</SubmitButton></form>}
      <form action={async (fd) => { "use server"; const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "?"; if (!(await hit("signin:ip:" + ip, 10, 3600)) || !(await hit("signin:email:" + String(fd.get("email") || "").toLowerCase(), 4, 3600))) redirect("/?verify=slow"); if (!(await verifyTurnstile(fd, ip))) redirect("/?verify=failed"); await recordIntent(fd.get("email")); await signIn("nodemailer", { email: fd.get("email"), redirectTo: "/profile" }); }}>
        <label htmlFor="email">Your email</label>
        <input id="email" name="email" type="email" placeholder="you@company.com" required />
        <Turnstile />
        {sp.verify && <p className="why" role="alert">{sp.verify === "slow" ? "Too many sign-in attempts. Please try again in an hour." : "We couldn't confirm you're human. Please try again."}</p>}
        <p></p><SubmitButton className={process.env.AUTH_LINKEDIN_ID ? undefined : "primary"}>Email me a sign-in link</SubmitButton>
      </form>
      {faces.length >= 3 && <section><h2>Some of the people on Kave</h2><ul className="faces">{faces.map((f) => <li key={f.id}><img src={"/api/photo/" + f.id} alt="" width="120" height="150" loading="lazy" /><b>{short(f.name, f.email)}</b><small>{f.headline}</small></li>)}</ul></section>}
          <p className="count"><b>{stats.count}</b> {stats.count === 1 ? "member" : "members"} so far{stats.foundingLeft > 0 ? `, and ${stats.foundingLeft} Founding 50 places still open.` : "."}</p>
        </div>
        <div>
          <div className="example"><span className="tag">How an introduction reads</span><p>You both know product design, and they can help with hiring your first engineer.</p></div>
          {faces.length >= 3 && <section><h2>Some of the people on Kave</h2><ul className="faces">{faces.map((f) => <li key={f.id}><img src={"/api/photo/" + f.id} alt="" width="120" height="150" loading="lazy" /><b>{short(f.name, f.email)}</b><small>{f.headline}</small></li>)}</ul></section>}
          <ol className="steps2">
            <li>Add your profile. A CV fills most of it in.</li>
            <li>See who's nearby and why you'd get on.</li>
            <li>Book a café and a time.</li>
          </ol>
        </div>
      </div>
      <p><small><a href="/how-to">How it works</a> · <a href="/contact">Contact</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></small></p>
    </main>
  );
}
