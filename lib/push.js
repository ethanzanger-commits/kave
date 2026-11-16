import { client } from "@/db";
let ready = false, webpush;
async function init() {
  if (ready) return true;
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv } = process.env;
  if (!pub || !priv) return false;
  const mod = await import("web-push"); webpush = mod.default || mod;
  webpush.setVapidDetails("mailto:" + (process.env.REPLY_TO || process.env.GMAIL_USER || "hello@example.com"), pub, priv);
  return (ready = true);
}
// Sends a phone notification if the member turned them on. Never throws.
export async function notify(userId, title, body, url = "/") {
  try {
    if (!userId || !(await init())) return;
    for (const s of await client`select endpoint, p256dh, auth from push_sub where "userId" = ${userId}`) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url })); }
      catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await client`delete from push_sub where endpoint = ${s.endpoint}`; }
    }
  } catch {}
}
