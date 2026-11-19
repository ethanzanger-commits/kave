import { auth } from "@/auth";
import { client } from "@/db";
import Notices from "./Notices";
import { pendingCount } from "@/lib/coffee";
export default async function Nav() {
  let n = 0, email = "", todo = 0;
  try {
    const s = await auth(); email = s?.user?.email || "";
    if (s?.user?.id) { const me = s.user.id; const [r] = await client`select ((select count(*) from dm_thread t where t.status = 'pending' and t.initiator <> ${me} and (t.a = ${me} or t.b = ${me}))
      + (select count(*) from dm_message m join dm_thread t on t.id = m."threadId" where t.status = 'accepted' and (t.a = ${me} or t.b = ${me}) and m."senderId" <> ${me} and m."readAt" is null))::int as n`; n = r.n; todo = await pendingCount(me); }
  } catch {}
  return (
    <>
    <nav aria-label="Main">
      <a className="brand" href="/discover">kave</a>
      <div className="links"><a href="/discover">Discover</a><a href="/around">People</a><a href="/messages">Messages{n > 0 && <span className="badge">{n}</span>}</a><a href="/matches">Coffees{todo > 0 && <span className="badge">{todo}</span>}</a><a href="/profile">Profile</a></div>
      <details className="more"><summary>More</summary><div>{email && <small style={{ display: "block", padding: ".4rem .8rem", opacity: .85 }}>Signed in as {email}</small>}<a href="/contacts">Contacts</a><a href="/story">Share your story</a><a href="/saved">Saved</a><a href="/circles">Circles</a><a href="/leaderboard">Leaders</a><a href="/invite">Invite</a><a href="/how-to">How it works</a><a href="/contact">Contact</a></div></details>
    </nav>
    <Notices />
    </>
  );
}
