import { auth } from "@/auth";
import { toCsv } from "@/lib/csv";
import * as I from "@/lib/intel";
export const dynamic = "force-dynamic";
const T = {
  Users: [I.users, I.USER_COLS], Matches: [I.matches, I.MATCH_COLS], Coffee_Activity: [I.coffeeActivity, I.COFFEE_COLS],
  Engagement: [I.engagement, I.ENG_COLS], Referrals: [I.referrals, I.REF_COLS], Network_Analysis: [I.network, I.NET_COLS],
};
export async function GET(req) {
  const s = await auth(); // admin only, enforced here on every export
  if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) return new Response("Forbidden", { status: 403 });
  const sp = new URL(req.url).searchParams, type = sp.get("type") || "";
  if (!T[type]) return new Response("Unknown export. Use: " + Object.keys(T).join(", "), { status: 400 });
  const full = sp.get("full") === "1", f = full ? I.NOFILTER : I.parseFilters(sp), now = new Date();
  try {
    const rows = await T[type][0](f);
    return new Response(toCsv(rows, T[type][1], now), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${type}_${full ? "full" : "filtered"}_${now.toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
  } catch { return new Response("Export failed. A table may be missing. Run migrations/kave17-admin-intel.sql and the earlier migrations in Neon.", { status: 500 }); }
}
