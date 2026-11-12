import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import Nav from "../Nav";
import { savedList } from "@/lib/social";
import { short } from "@/lib/leaders";
export const metadata = { title: "Saved · Kave" };
export default async function Saved() {
  const s = await auth(); if (!s?.user?.id) redirect("/");
  const list = await savedList(client, s.user.id);
  return (
    <main>
      <Nav />
      <h1>Saved</h1>
      <p className="lead">People you want to meet later. Open a profile when you're ready to ask.</p>
      {list.length === 0 ? <p>Nobody saved yet. Use "Save for later" on any profile.</p> : (
        <ul className="people">{list.map((r) => (
          <li key={r.id}>
            <a href={"/member/" + r.id}>{r.image ? <img src={r.image} alt="" width="64" height="64" referrerPolicy="no-referrer" /> : <div className="avatar">{short(r.name, r.email)[0]}</div>}</a>
            <div className="info"><h3><a href={"/member/" + r.id}>{short(r.name, r.email)}</a></h3><p>{[r.headline, r.city].filter(Boolean).join(", ")}</p></div>
          </li>))}</ul>)}
    </main>
  );
}
