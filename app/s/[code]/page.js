import { notFound } from "next/navigation";
import { who } from "@/lib/who";
import SubmitButton from "@/app/SubmitButton";
import Turnstile from "@/app/Turnstile";
import { landingEmail, landingOAuth } from "./actions";
export async function generateMetadata({ params }) {
  const r = await who((await params).code);
  return { title: `${r?.first || "A friend"} invited you to kave`, description: "Let's grab coffee. kave introduces you to people worth meeting in Israeli tech." };
}
export default async function Share({ params, searchParams }) {
  const { code } = await params, sp = (await searchParams) || {}, r = await who(code); if (!r) notFound();
  return (
    <main>
      <p className="logo"><a href="/" style={{ textDecoration: "none" }}>kave<span>.</span></a></p>
      <div className="who" style={{ margin: "1rem 0" }}>
        {r.hasPhoto && <img src={`/api/invite-photo/${code}`} alt={r.first} width="96" height="96" style={{ width: 96, height: 96, objectFit: "cover" }} referrerPolicy="no-referrer" />}
        <div><p className="eyebrow" style={{ margin: 0 }}>Invitation</p><h1 style={{ margin: 0, fontSize: "2rem" }}>{r.first} invited you to Kave</h1></div>
      </div>
      <p className="lead">{r.first}{r.headline ? `, ${r.headline}` : ""}{r.city ? ` in ${r.city}` : ""}, is on Kave, where professionals across Israel meet for coffee. We'll suggest {r.first} as your first match.</p>
      <ol className="steps2"><li>Join in about two minutes. A CV fills in most of your profile.</li><li>See who to meet, and why. {r.first} will be first on your list.</li><li>Pick a café and book the coffee.</li></ol>
      {process.env.AUTH_LINKEDIN_ID && <form action={landingOAuth.bind(null, code, "linkedin")}><SubmitButton className="primary">Continue with LinkedIn</SubmitButton></form>}
      {process.env.AUTH_GOOGLE_ID && <form action={landingOAuth.bind(null, code, "google")}><SubmitButton>Continue with Google</SubmitButton></form>}
      <form action={landingEmail.bind(null, code)}>
        <label htmlFor="email">Your email</label>
        <input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" />
        <Turnstile />
        {sp.verify && <p className="why" role="alert">{sp.verify === "slow" ? "Too many sign-in attempts. Please try again in an hour." : "We couldn't confirm you're human. Please try again."}</p>}
        <p></p><SubmitButton className="primary">Join {r.first} on Kave</SubmitButton>
      </form>
      <p><small>We'll email you a sign-in code. <a href="/how-to">How it works</a></small></p>
    </main>
  );
}
