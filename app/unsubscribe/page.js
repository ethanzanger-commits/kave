import { client } from "@/db";
import { sig } from "@/lib/unsub";
export const metadata = { title: "Unsubscribe · Kave" };
export default async function Unsub({ searchParams }) {
  const { e = "", t = "" } = await searchParams;
  const ok = Boolean(e) && t === sig(e);
  if (ok) await client`insert into optout (email) values (${e.toLowerCase()}) on conflict do nothing`;
  return <main><p className="logo">kave<span>.</span></p><h1>{ok ? "You're unsubscribed" : "That link isn't valid"}</h1><p className="lead">{ok ? "We won't send you profile reminders or weekly picks again." : "Open the unsubscribe link from your email again."}</p></main>;
}
