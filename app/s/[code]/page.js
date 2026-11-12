import { notFound } from "next/navigation";
import { who } from "@/lib/who";
export async function generateMetadata({ params }) {
  const r = await who((await params).code);
  return { title: `${r?.first || "A friend"} invited you to kave`, description: "Let's grab coffee. kave introduces you to people worth meeting in Israeli tech." };
}
export default async function Share({ params }) {
  const { code } = await params; const r = await who(code); if (!r) notFound();
  return (
    <main>
      <p className="logo">kave<span>.</span></p>
      <h1>Let's grab coffee on kave</h1>
      <p className="lead">{r.first}{r.headline ? `, ${r.headline},` : ""} is on kave, a private beta that introduces you to people worth meeting in Israeli tech, one coffee at a time.</p>
      <a className="cta" href={"/join?ref=" + code}>Join {r.first} on kave</a>
      <p><a href="/how-to">How it works</a></p>
    </main>
  );
}
