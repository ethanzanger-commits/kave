import { auth } from "@/auth";
import { client } from "@/db";
// Primary nav is four items. Secondary pages live under the menu. Badges show real counts only.
async function counts(me) {
  try {
    const [r] = await client`select
      (select count(*) from swipe s where s."toId" = ${me} and s.yes and not exists (select 1 from swipe y where y."fromId" = ${me} and y."toId" = s."fromId") and not exists (select 1 from block b where (b."fromId" = ${me} and b."toId" = s."fromId") or (b."fromId" = s."fromId" and b."toId" = ${me})))::int
      + (select count(*) from match m where (m.a = ${me} or m.b = ${me}) and m.status = 'proposed' and m."proposedBy" <> ${me})::int
      + (select count(*) from intro i where (i.a = ${me} and i."aYes" is null) or (i.b = ${me} and i."bYes" is null))::int as pending,
      (select count(*) from match m where (m.a = ${me} or m.b = ${me}) and case when m."whenText" ~ '^\\d{4}-\\d{2}-\\d{2}T' then m."whenText"::timestamp > (now() at time zone 'Asia/Jerusalem') else false end and (m.status = 'confirmed' or (m.status is null)))::int as upcoming`;
    return { pending: Number(r.pending || 0), upcoming: Number(r.upcoming || 0) };
  } catch { return { pending: 0, upcoming: 0 }; }
}
export default async function Nav() {
  const s = await auth().catch(() => null);
  const c = s?.user?.id ? await counts(s.user.id) : { pending: 0, upcoming: 0 };
  const badge = c.pending > 0 ? c.pending : 0;
  return (
    <nav aria-label="Main">
      <a className="brand" href="/discover">kave</a>
      <div className="links">
        <a href="/discover">Discover</a>
        <a href="/around">People</a>
        <a href="/matches">My Coffees{badge > 0 && <span className="dot" aria-label={`${badge} waiting for you`}>{badge}</span>}{badge === 0 && c.upcoming > 0 && <span className="dot soft" aria-label={`${c.upcoming} upcoming`}>{c.upcoming}</span>}</a>
        <a href="/profile">Profile</a>
      </div>
      <details className="more"><summary>More</summary><div><a href="/saved">Saved members</a><a href="/circles">Circles</a><a href="/leaderboard">Leaders</a><a href="/invite">Invitations</a><a href="/how-to">How it works</a><a href="/contact">Contact</a></div></details>
    </nav>
  );
}
