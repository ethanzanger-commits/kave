export const clean = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 40) || null;
// Stores a new member's acquisition channel and referrer once. First touch wins; self-referral is ignored.
export async function attributeSignup(q, user, { src, ref, circle, intent } = {}) {
  src = clean(intent?.source) || clean(src); ref = clean(intent?.ref) || clean(ref);
  let referrerId = null;
  if (ref) { const [r] = await q`select "userId" from profile where "refCode" = ${ref}`; if (r && r.userId !== user.id) referrerId = r.userId; }
  const source = src || (referrerId ? "referral" : circle ? "circle" : "direct");
  await q`insert into signup_attr ("userId", source, ref, "referrerId") values (${user.id}, ${source}, ${ref}, ${referrerId}) on conflict ("userId") do nothing`;
  await q`update "user" set source = coalesce(source, ${source}), "referredBy" = coalesce("referredBy", ${referrerId}) where id = ${user.id}`;
}
