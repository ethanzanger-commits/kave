import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import Nav from "../../../Nav";
import SubmitButton from "../../../SubmitButton";
import { startThread } from "../../actions";
import { short } from "@/lib/leaders";
export const dynamic = "force-dynamic";
export const metadata = { title: "New message", robots: { index: false } };
export default async function Compose({ params, searchParams }) {
  const { id } = await params, sp = (await searchParams) || {};
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent(`/messages/with/${id}`)); const me = s.user.id;
  if (id === me) redirect("/around");
  const [o] = await client`select u.id, u.name, u.email, p.headline, p.company from "user" u join profile p on p."userId" = u.id where u.id = ${id} and p."ageOk"
    and not exists (select 1 from block b where (b."fromId" = ${me} and b."toId" = u.id) or (b."fromId" = u.id and b."toId" = ${me}))`;
  if (!o) redirect("/around");
  const [a, b] = me < id ? [me, id] : [id, me];
  const [old] = await client`select id from dm_thread where a = ${a} and b = ${b}`;
  if (old) redirect(`/messages/${old.id}`);
  const name = short(o.name, o.email);
  return (
    <main>
      <Nav />
      <p><a href={"/member/" + id}>Back to profile</a></p>
      <h1 style={{ fontSize: "1.8rem" }}>Message {name}</h1>
      {o.headline && <p className="lead">{[o.headline, o.company].filter(Boolean).join(", ")}</p>}
      <p className="why">You can send one message first. {name} has to accept before you can keep chatting, so make it count.</p>
      {sp.e === "limit" && <p className="why" role="alert">You've reached today's limit for new conversations. Try again tomorrow.</p>}
      {sp.e === "empty" && <p className="why" role="alert">Write a message first.</p>}
      <form action={startThread.bind(null, id)}>
        <label htmlFor="text">Your message</label>
        <textarea id="text" name="text" required maxLength={500} rows={5} placeholder={`Hi ${name.split(" ")[0]}, I'd love to connect because...`} />
        <SubmitButton className="primary" pendingText="Sending…">Send message</SubmitButton>
      </form>
    </main>
  );
}
