import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { safeNext } from "@/lib/next";
export const metadata = { title: "Sign in to Kave", robots: { index: false } };
export const dynamic = "force-dynamic";
// Email sign-in links open THIS page first. Mail scanners and in-app browsers that pre-fetch the link only load this harmless page,
// so the one-time token is spent only when the person taps the button. Already signed in? Skip the token and go straight on.
export default async function Confirm({ searchParams }) {
  const sp = (await searchParams) || {}, host = (await headers()).get("host");
  let target = null, dest = "/discover";
  try { const u = new URL(String(sp.l || "")); if (u.host === host && u.pathname === "/api/auth/callback/nodemailer") { target = u.pathname + u.search; dest = safeNext(u.searchParams.get("callbackUrl") || "") || dest; } } catch {}
  if ((await auth())?.user?.id) redirect(dest);
  if (!target) redirect("/check-email?e=1");
  return (
    <main>
      <p className="logo">kave<span>.</span></p>
      <h1>You're one tap away</h1>
      <p className="lead">Tap to sign in to Kave on this device.</p>
      <p><a className="primary" href={target} style={{ display: "block", textAlign: "center", padding: "1rem", textDecoration: "none" }}>Sign in</a></p>
      <p><small>Link not working? <a href="/check-email">Type the 6-digit code from the email</a> instead.</small></p>
    </main>
  );
}
