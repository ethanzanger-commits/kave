import { auth } from "@/auth";
import { client } from "@/db";
import { redirect, notFound } from "next/navigation";
import Nav from "../../Nav";
import SubmitButton from "../../SubmitButton";
import AutoRefresh from "../AutoRefresh";
import { sendDm, respondDm, blockAndLeave } from "../actions";
import { short } from "@/lib/leaders";
export const dynamic = "force-dynamic";
export const metadata = { title: "Message", robots: { index: false } };
export default async function Thread({ params }) {
  const { id } = await params;
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent(`/messages/${id}`)); const me = s.user.id;
  const [t] = await client`select t.*, o.id as oid, o.name, o.email, p.headline from dm_thread t join "user" o on o.id = case when t.a = ${me} then t.b else t.a end left join profile p on p."userId" = o.id
    where t.id = ${id} and (t.a = ${me} or t.b = ${me}) and not exists (select 1 from block b where (b."fromId" = ${me} and b."toId" = o.id) or (b."fromId" = o.id and b."toId" = ${me}))`;
  if (!t) notFound();
  const msgs = await client`select id, "senderId", body, "at" from dm_message where "threadId" = ${id} order by "at" asc limit 300`;
  await client`update dm_message set "readAt" = now() where "threadId" = ${id} and "senderId" <> ${me} and "readAt" is null`;
  const name = short(t.name, t.email), mineFirst = t.initiator === me, accepted = t.status === "accepted";
  const canReply = accepted || !mineFirst;
  return (
    <main>
      <Nav /><AutoRefresh />
      <p><a href="/messages">All messages</a></p>
      <h1 style={{ fontSize: "1.8rem" }}><a href={"/member/" + t.oid}>{name}</a></h1>
      {t.headline && <p className="lead" style={{ marginBottom: ".8rem" }}>{t.headline}</p>}
      <ul className="chat" aria-live="polite">{msgs.map((m) => <li key={m.id} className={"bubble " + (m.senderId === me ? "me" : "them")}><p>{m.body}</p><small>{new Date(m.at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</small></li>)}</ul>
      {t.status === "pending" && !mineFirst && (
        <div className="why"><b>{name} wants to message you.</b> Accept to start chatting. Replying below also accepts.
          <div className="row" style={{ marginTop: ".6rem" }}><form action={respondDm.bind(null, id, true)}><SubmitButton className="primary">Accept</SubmitButton></form><form action={respondDm.bind(null, id, false)}><SubmitButton>Decline</SubmitButton></form></div></div>)}
      {t.status === "declined" && !mineFirst && <p className="why">You declined this request. You can still accept it by replying.</p>}
      {!accepted && mineFirst && <p className="why">Waiting for {name} to accept. You can send more once they reply.</p>}
      {canReply && <form action={sendDm.bind(null, id)}><label className="sr" htmlFor="text">Your message</label><textarea id="text" name="text" required maxLength={500} rows={3} placeholder={accepted ? "Write a message" : "Write a reply"} /><SubmitButton className="primary" pendingText="Sending…">Send</SubmitButton></form>}
      <p style={{ marginTop: "1.4rem" }}><small>Be kind and professional. <a href={"/member/" + t.oid}>View profile</a> · </small>
        <form action={blockAndLeave.bind(null, t.oid)} style={{ display: "inline" }}><SubmitButton style={{ width: "auto", minHeight: 0, padding: ".1rem .5rem", fontSize: ".8rem" }}>Block and report</SubmitButton></form></p>
    </main>
  );
}
