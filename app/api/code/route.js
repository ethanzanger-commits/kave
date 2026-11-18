import { cleanEmail } from "@/lib/email";
import { cookies } from "next/headers";
// Turns the typed code into Auth.js's normal sign-in request. Attempts are rate-limited in the Auth.js route wrapper.
export async function POST(req) {
  const fd = await req.formData();
  const code = String(fd.get("code") || "").trim();
  const email = String(fd.get("email") || (await cookies()).get("kave_email")?.value || "").trim().toLowerCase();
  const next = (await cookies()).get("kave_next")?.value; const cb = next && /^\/(?!\/)[A-Za-z0-9\-_/]*(\?[A-Za-z0-9\-_=&%.]*)?$/.test(next) ? next : "/profile";
  const to = !/^\d{6}$/.test(code) || !cleanEmail(email) ? "/check-email?e=1"
    : `/api/auth/callback/nodemailer?token=${code}&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(cb)}`;
  return Response.redirect(new URL(to, req.url), 303);
}
