import { auth } from "@/auth";
import { client } from "@/db";
import { notFound } from "next/navigation";
import { circleMembers } from "@/lib/social";
import { short } from "@/lib/leaders";
import { joinCircleAction, leaveCircle } from "../../actions";
export async function generateMetadata({ params }) {
  const [c] = await client`select name, blurb from circle where slug = ${(await params).slug}`;
  return c ? { title: `${c.name} on Kave`, description: c.blurb || "A circle on Kave." } : {};
}
export default async function CirclePage({ params }) {
  const { slug } = await params;
  const [c] = await client`select * from circle where slug = ${slug}`; if (!c) notFound();
  const s = await auth(), me = s?.user?.id;
  const members = await circleMembers(client, slug);
  const isMember = me ? (await client`select 1 as x from circle_member where "circleSlug" = ${slug} and "userId" = ${me}`).length > 0 : false;
  return (
    <main>
      <p className="logo"><a href={me ? "/discover" : "/"} style={{ textDecoration: "none" }}>kave<span>.</span></a></p>
      <h1>{c.name}</h1>
      <p className="lead">{c.blurb}</p>
      <p><b>{members.length}</b> {members.length === 1 ? "member" : "members"}</p>
      {!me ? <a className="cta" href={`/c/${slug}/join`}>Join Kave and this circle</a>
        : !isMember ? <form action={joinCircleAction.bind(null, slug)}><button className="primary">Join this circle</button></form>
        : <><ul className="people">{members.map((m) => <li key={m.id}><a href={"/member/" + m.id}>{m.image ? <img src={m.image} alt="" width="64" height="64" referrerPolicy="no-referrer" /> : <div className="avatar">{short(m.name, m.email)[0]}</div>}</a><div className="info"><h3><a href={"/member/" + m.id}>{short(m.name, m.email)}</a></h3><p>{[m.headline, m.city].filter(Boolean).join(", ")}</p></div></li>)}</ul>
          <form action={leaveCircle.bind(null, slug)}><button>Leave this circle</button></form></>}
    </main>
  );
}
