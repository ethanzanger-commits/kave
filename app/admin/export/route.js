import { auth } from "@/auth";
import { client } from "@/db";
export const dynamic = "force-dynamic";
const esc = (v) => {
  let t = v == null ? "" : v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join("; ") : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; // stops spreadsheet formula injection
  return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
const csv = (rows) => "\uFEFF" + (rows.length ? [Object.keys(rows[0]).join(","), ...rows.map((r) => Object.values(r).map(esc).join(","))].join("\r\n") : "no data") + "\r\n";
const Q = {
  members: () => client`select u.name, u.email, p.city, p.headline, p.company, p.industry, p.skills, p."linkedinUrl", p.availability, p."foundingNo" as founding_no, u.source, u."createdAt" as joined, p."completedAt" as profile_done, p.weekly
    from "user" u join profile p on p."userId" = u.id where u.id not like 'demo-%' and p."ageOk" order by u."createdAt" desc`,
  signups: () => client`select u.name, u.email, u.source, u."createdAt" as joined, coalesce(p."ageOk", false) as finished_profile, p.city
    from "user" u left join profile p on p."userId" = u.id where u.id not like 'demo-%' order by u."createdAt" desc`,
  matches: () => client`select m.id, ua.name as person_a, ub.name as person_b, pa.city as city_a, pb.city as city_b, m.status, m."whenText" as when_text, m.place, m.met as coffee_happened, m.at as created
    from match m left join "user" ua on ua.id = m.a left join "user" ub on ub.id = m.b left join profile pa on pa."userId" = m.a left join profile pb on pb."userId" = m.b
    where m.a not like 'demo-%' order by m.at desc`,
  requests: () => client`select uf.name as from_name, ut.name as to_name, s.yes as asked_for_coffee, s.at from swipe s left join "user" uf on uf.id = s."fromId" left join "user" ut on ut.id = s."toId"
    where s."fromId" not like 'demo-%' order by s.at desc limit 20000`,
  events: () => client`select e.name as action, u.email, e.at from event e left join "user" u on u.id = e."userId" where e.at > now() - interval '90 days' order by e.at desc limit 50000`,
  referrers: () => client`select coalesce(u.name, u.email) as referrer, u.email, count(*) as profiles_from_invites from profile p join "user" u on u.id = p."invitedBy" where p."invitedBy" is not null and not coalesce(p."isDemo", false) group by u.id, u.name, u.email order by 3 desc`,
  skills: () => client`select s as skill, count(*) as members from profile p, jsonb_array_elements_text(case when jsonb_typeof(p.skills) = 'array' then p.skills else '[]'::jsonb end) s
    where p."ageOk" and not coalesce(p."isDemo", false) group by s order by members desc`,
};
export async function GET(req) {
  const s = await auth();
  if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) return new Response("Forbidden", { status: 403 });
  const type = new URL(req.url).searchParams.get("type") || "";
  if (!Q[type]) return new Response("Unknown export. Use: " + Object.keys(Q).join(", "), { status: 400 });
  try {
    const rows = await Q[type]();
    return new Response(csv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="kave-${type}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
  } catch { return new Response("Export failed. A table may be missing. Run the migrations in Neon.", { status: 500 }); }
}
