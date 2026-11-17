import { client } from "@/db";
import { tierFor } from "@/lib/rewards";
// Public badge data for a member's invite code: first name, badge title and a one-line subtitle.
export async function badgeFor(code) {
  if (!/^[a-z0-9]{4,12}$/.test(code || "")) return null;
  try {
    const [r] = await client`select u.id, u.name, p."foundingNo" as f from profile p join "user" u on u.id = p."userId" where p."refCode" = ${code} and p."ageOk"`;
    if (!r) return null;
    const [{ n }] = await client`select count(*)::int as n from profile where "invitedBy" = ${r.id} and "ageOk"`;
    const tier = tierFor(n);
    return { first: (r.name || "A member").split(" ")[0], n, label: r.f ? `Founding Member #${r.f}` : tier ? tier.name : "Kave Member", sub: n > 0 ? `${n} ${n === 1 ? "friend" : "friends"} brought to Kave` : "Meeting new people over coffee" };
  } catch { return null; }
}
