"use server";
import { auth } from "@/auth";
import { db } from "@/db";
import { matches, users } from "@/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hit } from "@/lib/limit";
import { logCoffee } from "@/lib/matchlog";
import { notify } from "@/lib/notify";
import { short } from "@/lib/leaders";
import { shareConsent, withdrawConsent } from "@/lib/whatsapp";
const ERR = { invalid: "wa_invalid", need_phone: "wa_phone", closed: "closed" };
async function ctx(fd) {
  const id = String(fd.get("id") || ""), s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent(`/coffee/${id}`));
  const [m] = await db.select().from(matches).where(eq(matches.id, id)); if (!m || (m.a !== s.user.id && m.b !== s.user.id)) redirect("/matches");
  return { id, me: s.user.id, other: m.a === s.user.id ? m.b : m.a, mn: short(s.user.name, s.user.email) };
}
const refresh = (id) => { revalidatePath("/matches"); revalidatePath(`/coffee/${id}`); };
export async function shareWhatsApp(fd) {
  const { id, me, other, mn } = await ctx(fd);
  if (!(await hit("wa:" + me, 20, 3600))) redirect(`/coffee/${id}?e=slow`);
  const r = await shareConsent(id, me, String(fd.get("phone") || "").slice(0, 40));
  if (ERR[r]) redirect(`/coffee/${id}?e=${ERR[r]}#whatsapp`);
  if (r === "requested") { await logCoffee(me, id, "whatsapp_connect_requested", {}); await notify(other, `${mn} would like to connect on WhatsApp`, "Only share if you want to.", `/coffee/${id}#whatsapp`); }
  if (r === "accepted") { await logCoffee(me, id, "whatsapp_connect_accepted", {}); await notify(other, "WhatsApp connection is ready", "You both agreed.", `/coffee/${id}#whatsapp`); }
  refresh(id);
}
export async function skipWhatsApp(fd) { const { id } = await ctx(fd); refresh(id); } // "not now": records nothing
export async function stopWhatsApp(fd) {
  const { id, me } = await ctx(fd);
  if (await withdrawConsent(id, me, fd.get("erase") === "on")) await logCoffee(me, id, "whatsapp_connect_withdrawn", {});
  refresh(id);
}
