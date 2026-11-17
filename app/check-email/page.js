import { cookies } from "next/headers";
export const metadata = { title: "Check your email", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function CheckEmail({ searchParams }) {
  const sp = (await searchParams) || {}, email = (await cookies()).get("kave_email")?.value || "", bad = !!(sp.error || sp.e);
  const code = /^\d{6}$/.test(String(sp.code || "")) ? String(sp.code) : "", to = /^[^@\s]+@[^@\s]+$/.test(String(sp.email || "")) ? String(sp.email) : "";
  if (code && to && !bad) return (
    <main>
      <p className="logo"><a href="/" style={{ textDecoration: "none" }}>kave<span>.</span></a></p>
      <h1>Finish signing in</h1>
      <p className="lead">Tap the button to sign in as <b>{to}</b>.</p>
      <form action="/api/code" method="post"><input type="hidden" name="code" value={code} /><input type="hidden" name="email" value={to} /><button className="primary" type="submit">Sign in to Kave</button></form>
      <p><small>Not you? Close this page. The link works once and expires in 30 minutes.</small></p>
    </main>
  );
  return (
    <main>
      <p className="logo"><a href="/" style={{ textDecoration: "none" }}>kave<span>.</span></a></p>
      <h1>{bad ? "That didn't work" : "Check your email"}</h1>
      {bad ? <p className="why" role="alert">The code is wrong, already used or has expired. Each code works once, and a newer email replaces the older one. Use the newest email, or <a href="/">request a new one</a>.</p>
        : <p className="lead">{email ? <>We sent a sign-in link and a 6-digit code to <b>{email}</b>.</> : "We sent you a sign-in link and a 6-digit code."}</p>}
      <form action="/api/code" method="post">
        {!email && <label>Your email<input type="email" name="email" required autoComplete="email" /></label>}
        <label htmlFor="code">6-digit code</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus style={{ fontSize: "1.6rem", letterSpacing: ".3em" }} />
        <p></p><button className="primary" type="submit">Sign in</button>
      </form>
      <p><small>Easiest on a phone: type the code here so you never leave this page. Nothing in your inbox? Check spam, or <a href="/">send a new code</a>.</small></p>
    </main>
  );
}
