"use server";
import { auth } from "@/auth";
import { client } from "@/db";
import { revalidatePath } from "next/cache";
async function admin() { const s = await auth(); if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) throw new Error("Admin only"); }
export async function createCircle(fd) {
  await admin();
  const name = String(fd.get("name") || "").trim().slice(0, 60), blurb = String(fd.get("blurb") || "").trim().slice(0, 200);
  if (!name) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "circle";
  await client`insert into circle (slug, name, blurb) values (${slug}, ${name}, ${blurb}) on conflict do nothing`;
  revalidatePath("/admin/circles");
}
export async function toggleReminders() {
  await admin();
  const [r] = await client`select value from setting where key = 'reminders_paused'`;
  await client`insert into setting (key, value) values ('reminders_paused', ${r?.value === "1" ? "0" : "1"}) on conflict (key) do update set value = excluded.value`;
  revalidatePath("/admin/growth");
}
export async function saveReminderSettings(fd) {
  await admin();
  for (const k of ["h1", "h2", "h3"]) { const v = Math.max(1, Math.min(720, Math.round(Number(fd.get(k)) || 0))); await client`insert into setting (key, value) values (${k}, ${String(v)}) on conflict (key) do update set value = excluded.value`; }
  revalidatePath("/admin/growth");
}

export async function createExperiment(fd) {
  await admin();
  const g = (k, n) => String(fd.get(k) || "").trim().slice(0, n) || null;
  if (!g("name", 120)) return;
  await client`insert into experiment (name, hypothesis, channel, "startsOn", "endsOn", metric) values (${g("name", 120)}, ${g("hypothesis", 400)}, ${(g("channel", 30) || "").toLowerCase() || null}, ${g("startsOn", 10)}, ${g("endsOn", 10)}, ${g("metric", 120)})`;
  revalidatePath("/admin/experiments");
}
export async function updateExperiment(fd) {
  await admin();
  const status = ["planned", "running", "done"].includes(fd.get("status")) ? fd.get("status") : "running";
  await client`update experiment set status = ${status}, result = ${String(fd.get("result") || "").slice(0, 600) || null}, learnings = ${String(fd.get("learnings") || "").slice(0, 600) || null} where id = ${String(fd.get("id"))}`;
  revalidatePath("/admin/experiments");
}
