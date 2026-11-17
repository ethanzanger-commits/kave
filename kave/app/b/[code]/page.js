import { notFound } from "next/navigation";
import { badgeFor } from "@/lib/badge";
export async function generateMetadata({ params }) {
  const b = await badgeFor((await params).code);
  return { title: b ? `${b.first} is a ${b.label} on Kave` : "Kave", description: "Kave matches professionals across Israel for in-person coffee." };
}
export default async function Badge({ params }) {
  const { code } = await params, b = await badgeFor(code); if (!b) notFound();
  return (
    <main>
      <p className="logo"><a href="/" style={{ textDecoration: "none" }}>kave<span>.</span></a></p>
      <h1>{b.first} is a {b.label} on Kave</h1>
      <img src={`/b/${code}/opengraph-image`} alt={`${b.first}'s Kave badge: ${b.label}`} width="1200" height="630" style={{ width: "100%", height: "auto" }} />
      <p className="lead">Kave matches professionals across Israel for in-person coffee, with a reason why each pair should meet.</p>
      <a className="cta" href={`/s/${code}?src=badge`}>Join {b.first} on Kave</a>
    </main>
  );
}
