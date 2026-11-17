import { cookies } from "next/headers";
import { client } from "@/db";
import { attributeSignup, clean } from "@/lib/attr-core";
// Called when Auth.js creates a new user. Never throws.
export async function recordSignup(user) {
  try {
    let c = null; try { c = await cookies(); } catch {}
    const [intent] = user.email ? await client`select source, ref from intent where email = ${user.email.toLowerCase()}` : [];
    await attributeSignup(client, user, { src: c?.get("src")?.value, ref: c?.get("ref")?.value, circle: c?.get("circle")?.value, intent });
  } catch {}
}
// Called when someone asks for a sign-in link, so attribution survives opening the email in another browser.
export async function recordIntent(email) {
  try {
    const e = String(email || "").trim().toLowerCase(); if (!e) return;
    const c = await cookies();
    await client`insert into intent (email, source, ref) values (${e}, ${clean(c.get("src")?.value)}, ${clean(c.get("ref")?.value)}) on conflict (email) do update set source = coalesce(intent.source, excluded.source), ref = coalesce(intent.ref, excluded.ref)`;
  } catch {}
}
