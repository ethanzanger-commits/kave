import { cookies } from "next/headers";
// Turns the typed code into Auth.js's normal sign-in request. Attempts are rate-limited in the Auth.js route wrapper.
export async function POST(req) {
  const fd = await req.formData();
  const code = String(fd.get("code") || "").trim();
  const email = String(fd.get("email") || (await cookies()).get("kave_email")?.value || "").trim().toLowerCase();
  const to = !/^\d{6}$/.test(code) || !/^[^@\s]+@[^@\s]+$/.test(email) ? "/check-email?e=1"
    : `/api/auth/callback/nodemailer?token=${code}&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent("/profile")}`;
  return Response.redirect(new URL(to, req.url), 303);
}
