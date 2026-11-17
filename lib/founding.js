// Atomic Founding 50 numbering. The unique index plus the 1..50 check make duplicates and a 51st badge impossible; a lost race is retried.
export async function awardFounding(q, userId) {
  for (let i = 0; i < 6; i++) {
    try {
      const r = await q`update profile set "foundingNo" = (select coalesce(max("foundingNo"), 0) + 1 from profile) where "userId" = ${userId} and "foundingNo" is null and not coalesce("isDemo", false) and "userId" not like 'demo-%' and (select count(*) from profile where "foundingNo" is not null) < 50 returning "foundingNo"`;
      return r[0]?.foundingNo ?? null;
    } catch (e) { if (!/unique|duplicate|check/i.test(String(e.message))) throw e; }
  }
  return null;
}
