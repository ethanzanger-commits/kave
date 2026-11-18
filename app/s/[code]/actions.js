"use server";
import { cleanEmail } from "@/lib/email";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { client } from "@/db";
import { hit } from "@/lib/limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { clean } from "@/lib/attr-core";
const valid = (c) => /^[a-z0-9]{4,12}$/.test(c || "");
const opts = (maxAge) => ({ httpOnly: true, sameSite: "lax", maxAge, path: "/" });
// Sign-up from an invitation page. Remembers who invited them, so the inviter is credited and suggested first.
export async function landingEmail(code, fd) {
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (!cleanEmail(email)) redirect(`/s/${code}`);
  if (!(await hit("signin:ip:" + ip, 10, 3600)) || !(await hit("signin:email:" + email, 4, 3600))) redirect(`/s/${code}?verify=slow`);
  if (!(await verifyTurnstile(fd, ip))) redirect(`/s/${code}?verify=failed`);
  const c = await cookies();
  if (valid(code)) c.set("ref", code, opts(60 * 60 * 24 * 30));
  c.set("kave_email", email, opts(1800));
  try { await client`insert into intent (email, source, ref) values (${email}, ${clean(c.get("src")?.value)}, ${valid(code) ? code : null}) on conflict (email) do update set source = coalesce(intent.source, excluded.source), ref = coalesce(intent.ref, excluded.ref)`; } catch {}
  await signIn("nodemailer", { email, redirectTo: "/profile" });
}
export async function landingOAuth(code, provider) {
  if (valid(code)) (await cookies()).set("ref", code, opts(60 * 60 * 24 * 30));
  await signIn(provider, { redirectTo: "/profile" });
}
