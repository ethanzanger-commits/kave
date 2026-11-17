// SQL for endorsements, saved members, circles, homepage faces and push subscriptions. Each takes the raw `client` as `q`.
export const endorsementsFor = (q, id) => q`select t.text, u.name, u.email from thanks t join "user" u on u.id = t."fromId" join match m on m.id = t."matchId" where t."isPublic" and not coalesce(t.hidden, false) and (m.a = ${id} or m.b = ${id}) and t."fromId" <> ${id} order by t.at desc limit 6`;
export const homeFaces = (q) => q`select p."userId" as id, u.name, u.email, p.headline from profile p join "user" u on u.id = p."userId" where p."showOnHome" and p."ageOk" and u.image is not null and p."userId" not like 'demo-%' order by p."completedAt" desc nulls last limit 8`;
export async function toggleSaved(q, me, target) {
  const r = await q`delete from saved where "userId" = ${me} and "targetId" = ${target} returning 1 as x`;
  if (!r.length) await q`insert into saved ("userId", "targetId") values (${me}, ${target}) on conflict do nothing`;
  return !r.length;
}
export const savedList = (q, me) => q`select p."userId" as id, u.name, u.email, u.image, p.headline, p.city from saved s join profile p on p."userId" = s."targetId" join "user" u on u.id = p."userId" where s."userId" = ${me} and p."ageOk" order by s.at desc`;
export const joinCircle = (q, slug, me) => q`insert into circle_member ("circleSlug", "userId") select ${slug}, ${me} where exists (select 1 from circle where slug = ${slug}) on conflict do nothing`;
export const circleMembers = (q, slug) => q`select p."userId" as id, u.name, u.email, u.image, p.headline, p.city from circle_member c join profile p on p."userId" = c."userId" join "user" u on u.id = p."userId" where c."circleSlug" = ${slug} and p."ageOk" and p."userId" not like 'demo-%' order by c.at`;
export const savePushSub = (q, userId, sub) => q`insert into push_sub (endpoint, "userId", p256dh, auth) values (${sub.endpoint}, ${userId}, ${sub.keys.p256dh}, ${sub.keys.auth}) on conflict (endpoint) do update set "userId" = excluded."userId", p256dh = excluded.p256dh, auth = excluded.auth`;
