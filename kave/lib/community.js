// Counts completed, real (non-demo) profiles across all of Israel. Milestones come from the MILESTONES env var.
export async function communityStats(q, ms = process.env.MILESTONES || "50,100,250,500,1000") {
  try {
    const [c] = await q`select count(*)::int as n from profile p join "user" u on u.id = p."userId" where p."ageOk" and not coalesce(p."isDemo", false) and p."userId" not like 'demo-%' and coalesce(p.about, '') <> '' and coalesce(p.headline, '') <> '' and coalesce(p.city, '') <> '' and u.image is not null and jsonb_array_length(coalesce(p.skills, '[]'::jsonb)) > 0`;
    const [f] = await q`select count(*)::int as n from profile where "foundingNo" is not null`;
    const list = ms.split(",").map(Number).filter((x) => x > 0).sort((a, b) => a - b);
    const count = c.n, target = list.find((m) => m > count) || list[list.length - 1] || 50;
    return { count, target, remaining: Math.max(0, target - count), foundingLeft: Math.max(0, 50 - f.n) };
  } catch { return { count: 0, target: 50, remaining: 50, foundingLeft: 50 }; }
}
