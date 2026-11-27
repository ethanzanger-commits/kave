import { db, client } from "@/db";
import { events } from "@/schema";
import { capture } from "@/lib/posthog";
// Fire-and-forget: analytics must never break the app.
// Writes to our own `event` table (the source for /admin) and forwards to PostHog when configured.
export async function track(userId, name) {
  try {
    if (!userId || String(userId).startsWith("demo-")) return;
    await db.insert(events).values({ userId, name });
    await capture(userId, name);
  } catch {}
}
// Records an event only if this user hasn't logged it within `hours` (0 = only ever once).
export async function trackOnce(userId, name, hours = 0) {
  try {
    if (!userId || String(userId).startsWith("demo-")) return;
    const [r] = hours > 0
      ? await client`select 1 as x from event where "userId" = ${userId} and name = ${name} and at > now() - make_interval(hours => ${hours}) limit 1`
      : await client`select 1 as x from event where "userId" = ${userId} and name = ${name} limit 1`;
    if (!r) await track(userId, name);
  } catch {}
}
// Anonymous pre-login events (PostHog only; we have no user id yet).
export const trackAnon = (name, props) => capture("anon-" + crypto.randomUUID(), name, props);
