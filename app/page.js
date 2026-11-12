import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db, client } from "@/db";
import { communityStats } from "@/lib/community";
import Milestone from "./Milestone";
import { profiles, users } from "@/schema";
import { eq } from "drizzle-orm";
export default async function Home() {
  if ((await auth())?.user?.id) redirect("/profile");
  const stats = await communityStats(client);
  const ref = (await cookies()).get("ref")?.value; let from = null;
  if (ref) { const [r] = await db.select({ n: users.name }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(eq(profiles.refCode, ref)); from = r?.n?.split(" ")[0]; }
  const go = (p) => async () => { "use server"; await signIn(p, { redirectTo: "/profile" }); };
  return (
    <main>
      <p className="logo">kave<span>.</span> </p>
      {from && <p className="why"><b>{from} invited you.</b> Join and you both get a head start.</p>}
      <h1>Meet someone worth knowing, over coffee.</h1>
      <p className="lead">Professionals across Israel, one good coffee at a time.</p>
      <div className="card">
        {process.env.AUTH_LINKEDIN_ID && <form action={go("linkedin")}><button className="primary">Continue with LinkedIn</button></form>}
        {process.env.AUTH_GOOGLE_ID && <form action={go("google")}><button>Continue with Google</button></form>}
        <form action={async (fd) => { "use server"; await signIn("nodemailer", { email: fd.get("email"), redirectTo: "/profile" }); }}>
          <input name="email" type="email" placeholder="you@company.com" required />
          <p></p><button className="primary">Get my magic link </button>
        </form>
      </div>
      {stats.foundingLeft > 0 && <p className="why"><b>Founding 50:</b> {stats.foundingLeft} spots left. The first 50 completed profiles get a permanent badge.</p>}
      <Milestone stats={stats} />
      <div className="card sample">
        <small>Example match</small>
        <div className="who"><div className="avatar">N</div><div><h2>Noa</h2><p>Growth lead · Rehavia</p></div></div>
        <p className="why"><b>Why you two?</b> you both know partnerships, and you're both around Rehavia.</p>
        <p><span className="chip">partnerships</span><span className="chip">B2B SaaS</span><span className="chip">growth</span></p>
      </div>
      <div className="steps">
        <p>1. Drop your CV. We build your profile in seconds.</p>
        <p>2. Meet people worth meeting, with a reason why.</p>
        <p>3. Match, pick a café, and go.</p>
      </div>
      <p>Private beta · across Israel · <a href="/how-to">How it works</a> · <a href="/contact">Contact</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p>
    </main>
  );
}
