import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import Nav from "../Nav";
export const metadata = { title: "Circles · Kave" };
export default async function Circles() {
  const s = await auth(); if (!s?.user?.id) redirect("/");
  const list = await client`select c.slug, c.name, c.blurb, (select count(*) from circle_member m join profile p on p."userId" = m."userId" where m."circleSlug" = c.slug and p."ageOk")::int as n from circle c order by c.at`;
  return (
    <main>
      <Nav />
      <h1>Circles</h1>
      <p className="lead">Smaller groups inside Kave, around a field or a background. Join one to meet people who share it.</p>
      {list.length === 0 ? <p>No circles yet.</p> : list.map((c) => <div className="card" key={c.slug}><h2><a href={"/c/" + c.slug}>{c.name}</a></h2><p>{c.blurb}</p><p><small>{c.n} {c.n === 1 ? "member" : "members"}</small></p></div>)}
    </main>
  );
}
