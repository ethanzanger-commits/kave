"use server";
import { auth } from "@/auth";
import { client } from "@/db";
import { revalidatePath } from "next/cache";
async function admin() { const s = await auth(); if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) throw new Error("Admin only"); }
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
