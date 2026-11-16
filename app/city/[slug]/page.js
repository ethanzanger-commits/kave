import { client } from "@/db";
import { notFound } from "next/navigation";
import { CITIES } from "@/lib/cities";
export const revalidate = 3600;
const slugOf = (c) => c.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
const find = (slug) => CITIES.find((c) => slugOf(c) === slug);
const label = (c) => c.replace("-Yafo", "");
export async function generateMetadata({ params }) {
  const c = find((await params).slug); if (!c) return {};
  const t = `Coffee meetups for professionals in ${label(c)} | kave`;
  return { title: t, description: `Meet people outside your usual circle over coffee in ${label(c)}. Kave matches Israeli tech and business professionals for real, in-person coffees.`, openGraph: { title: t }, alternates: { canonical: `/city/${slugOf(c)}` } };
}
export default async function City({ params }) {
  const c = find((await params).slug); if (!c) notFound();
  let n = 0, tops = [];
  try {
    [{ n }] = await client`select count(*)::int as n from profile where "ageOk" and city = ${c} and not coalesce("isDemo", false)`;
    tops = await client`select industry as label from profile where "ageOk" and city = ${c} and industry is not null and industry <> '' and not coalesce("isDemo", false) group by industry order by count(*) desc limit 5`;
  } catch {}
  return (
    <main>
      <p className="logo"><a href="/" style={{ textDecoration: "none" }}>kave<span>.</span></a></p>
      <h1>Grab coffee with someone new in {label(c)}</h1>
      <p className="lead">Kave matches professionals across Israel for real coffees. Tell us what you do, and we'll suggest people worth meeting, with a reason why.</p>
      {n >= 10 ? <p><b>{n} professionals in {label(c)}</b> are already on Kave{tops.length ? `, across ${tops.map((t) => t.label).join(", ")}` : ""}.</p> : <p>Kave is growing in {label(c)}. Join now and be among the first people here.</p>}
      <ol><li>Build a profile in two minutes, from your CV or LinkedIn export.</li><li>Get matched with people who share your interests or can help.</li><li>Book a coffee at a café you both like.</li></ol>
      <p><a className="chip" href="/?src=city">Join kave</a> <a href="/how-to">How it works</a></p>
    </main>
  );
}
