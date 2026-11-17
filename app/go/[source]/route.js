import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { client } from "@/db";
// Tracked links: kave-seven.vercel.app/go/linkedin remembers where a visitor came from.
export async function GET(req, { params }) {
  const { source } = await params;
  const s = String(source).toLowerCase();
  if (/^[a-z0-9_-]{1,30}$/.test(s)) {
    (await cookies()).set("src", s, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax" });
    try { await client`insert into event (name) values (${"visit:" + s})`; } catch {}
  }
  redirect("/");
}
