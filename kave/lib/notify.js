import { client } from "@/db";
import { TIERS } from "@/lib/rewards";
import { sendTemplate } from "@/lib/emails";
export async function notify(userId, text, link) {
  try { await client`insert into notice ("userId", text, link) values (${userId}, ${text}, ${link || null})`; } catch {}
}
// Tells the person who invited someone that their friend finished a profile, and how close they are to the next perk.
export async function notifyReferrer(referrerId, friendName, base) {
  const [{ n }] = await client`select count(*)::int as n from profile where "invitedBy" = ${referrerId} and "ageOk"`;
  const [ref] = await client`select email from "user" where id = ${referrerId}`; if (!ref) return;
  const first = String(friendName || "A friend").trim().split(" ")[0] || "A friend";
  const now = TIERS.find((t) => t.n === n), next = TIERS.find((t) => t.n > n), left = next ? next.n - n : 0;
  const line = now ? `You've earned ${now.name}: ${now.perk}.` : next ? `${left} more ${left === 1 ? "friend" : "friends"} for ${next.name}.` : "You've unlocked every perk.";
  await notify(referrerId, `${first} joined Kave through your invite. ${line}`, "/invite");
  try { await sendTemplate(ref.email, "referralJoined", { friend: first, n, line, base }); } catch {}
}
