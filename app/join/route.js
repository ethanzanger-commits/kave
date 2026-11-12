import { client } from "@/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export async function GET(req) {
  const ref = new URL(req.url).searchParams.get("ref");
  if (ref && /^[a-z0-9]{4,12}$/.test(ref)) (await cookies()).set("ref", ref, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax" });
  if (ref && /^[a-z0-9]{4,12}$/.test(ref)) { try { const [r] = await client`select "userId" from profile where "refCode" = ${ref}`; if (r) await client`insert into event ("userId", name) values (${r.userId}, 'ref_visit')`; } catch {} }
  redirect("/");
}
