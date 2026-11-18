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
import { safeNext } from "@/lib/next";
import Turnstile from "./Turnstile";
import { headers } from "next/headers";
export default async function Home({ searchParams }) {
  const sp = (await searchParams) || {}, next = safeNext(sp.next);
  if ((await auth())?.user?.id) redirect("/profile");
  const stats = await communityStats(client);
  const faces = await homeFaces(client).catch(() => []);
  const ref = (await cookies()).get("ref")?.value; let from = null;
  if (ref) { const [r] = await db.select({ n: users.name }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(eq(profiles.refCode, ref)); from = r?.n?.split(" ")[0]; }
  const go = (p, nx) => async () => { "use server"; await signIn(p, { redirectTo: safeNext(nx) || "/profile" }); };
  return (
    <main>
      <p className="logo">kave<span>.</span></p>
      {from && <p className="why"><b>{from} invited you.</b> Join and you both get a head start.</p>}
      <h1>Meet people in your field, over coffee.</h1>
      <p className="lead">Kave introduces professionals across Israel. You see why two people should meet, pick a café, and go.</p>
      {next && <p className="why" role="status">Sign in to continue to the page you opened.</p>}
      {process.env.AUTH_LINKEDIN_ID && <form action={go("linkedin", next)}><SubmitButton className="primary">Continue with LinkedIn</SubmitButton></form>}
      {process.env.AUTH_GOOGLE_ID && <form action={go("google", next)}><SubmitButton>Continue with Google</SubmitButton></form>}
      <form action={async (fd) => { "use server"; const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "?"; if (!(await hit("signin:ip:" + ip, 10, 3600)) || !(await hit("signin:email:" + String(fd.get("email") || "").toLowerCase(), 4, 3600))) redirect("/?verify=slow"); if (!(await verifyTurnstile(fd, ip))) redirect("/?verify=failed"); await recordIntent(fd.get("email")); (await cookies()).set("kave_email", String(fd.get("email") || "").trim().toLowerCase(), { httpOnly: true, sameSite: "lax", maxAge: 1800, path: "/" }); const nx = safeNext(fd.get("next")) || "/profile"; (await cookies()).set("kave_next", nx, { httpOnly: true, sameSite: "lax", maxAge: 1800, path: "/" }); await signIn("nodemailer", { email: fd.get("email"), redirectTo: nx }); }}>
        <label htmlFor="email">Your email</label>
        <input id="email" name="email" type="email" placeholder="you@company.com" required />
        <Turnstile />
        <input type="hidden" name="next" value={next || ""} />
        {sp.verify && <p className="why" role="alert">{sp.verify === "slow" ? "Too many sign-in attempts. Please try again in an hour." : "We couldn't confirm you're human. Please try again."}</p>}
        <p></p><SubmitButton className="primary">Email me a sign-in link</SubmitButton>
      </form>
      {faces.length >= 3 && <section><h2>Some of the people on Kave</h2><ul className="faces">{faces.map((f) => <li key={f.id}><img src={"/api/photo/" + f.id} alt="" width="120" height="150" loading="lazy" /><b>{short(f.name, f.email)}</b><small>{f.headline}</small></li>)}</ul></section>}
      <p className="count"><b>{stats.count}</b> {stats.count === 1 ? "member" : "members"} so far{stats.foundingLeft > 0 ? `, and ${stats.foundingLeft} Founding 50 places still open.` : "."}</p>
      <ol className="steps2">
        <li>Add your profile. A CV fills most of it in.</li>
        <li>See who's nearby and why you'd get on.</li>
        <li>Book a café and a time.</li>
      </ol>
      <p><small><a href="/how-to">How it works</a> · <a href="/contact">Contact</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></small></p>
    </main>
  );
}
