import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import Nav from "../Nav";
import AutoRefresh from "./AutoRefresh";
import { short } from "@/lib/leaders";
export const metadata = { title: "Messages", robots: { index: false } };
export const dynamic = "force-dynamic";
const ago = (d) => { const m = Math.round((Date.now() - new Date(d)) / 6e4); return m < 1 ? "now" : m < 60 ? m + "m" : m < 1440 ? Math.round(m / 60) + "h" : Math.round(m / 1440) + "d"; };
export default async function Messages() {
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent("/messages")); const me = s.user.id;
  let rows = [], err = false;
  try {
    rows = await client`select t.id, t.status, t.initiator, t."lastAt", o.id as oid, o.name, o.email, p.headline,
      (select body from dm_message m where m."threadId" = t.id order by m."at" desc limit 1) as last,
      (select count(*)::int from dm_message m where m."threadId" = t.id and m."senderId" <> ${me} and m."readAt" is null) as unread
      from dm_thread t join "user" o on o.id = case when t.a = ${me} then t.b else t.a end left join profile p on p."userId" = o.id
      where (t.a = ${me} or t.b = ${me}) and not exists (select 1 from block b where (b."fromId" = ${me} and b."toId" = o.id) or (b."fromId" = o.id and b."toId" = ${me}))
      order by t."lastAt" desc limit 100`;
  } catch { err = true; }
  const reqs = rows.filter((r) => r.status !== "accepted" && r.initiator !== me && r.status === "pending");
  const chats = rows.filter((r) => r.status === "accepted");
  const sent = rows.filter((r) => r.status !== "accepted" && r.initiator === me);
  const Row = ({ r }) => (<li><a className="thread" href={"/messages/" + r.id}><div className="avatar">{short(r.name, r.email)[0]}</div><div className="info"><h3>{short(r.name, r.email)}{r.unread > 0 && <span className="badge">{r.unread}</span>}</h3><p>{r.headline}</p><p className="preview">{r.last}</p></div><small>{ago(r.lastAt)}</small></a></li>);
  return (
    <main>
      <Nav /><AutoRefresh />
      <h1>Messages</h1>
      {err && <p className="why">Messaging isn't set up yet. Run the kave11 migration in Neon.</p>}
      {reqs.length > 0 && <section><h2>Message requests</h2><p><small>Accept to start chatting. Replying also accepts.</small></p><ul className="people">{reqs.map((r) => <Row key={r.id} r={r} />)}</ul></section>}
      <section><h2>Conversations</h2>{chats.length === 0 ? <p>No conversations yet. Open someone's profile and tap Message to send a first note.</p> : <ul className="people">{chats.map((r) => <Row key={r.id} r={r} />)}</ul>}</section>
      {sent.length > 0 && <section><h2>Waiting for a reply</h2><ul className="people">{sent.map((r) => <Row key={r.id} r={r} />)}</ul></section>}
    </main>
  );
}
