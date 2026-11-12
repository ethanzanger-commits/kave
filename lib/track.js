import { db } from "@/db";
import { events } from "@/schema";
// Fire-and-forget: analytics must never break the app.
export async function track(userId, name) {
  try { if (userId && !String(userId).startsWith("demo-")) await db.insert(events).values({ userId, name }); } catch {}
}
