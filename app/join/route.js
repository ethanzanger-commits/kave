import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export async function GET(req) {
  const ref = new URL(req.url).searchParams.get("ref");
  if (ref && /^[a-z0-9]{4,12}$/.test(ref)) (await cookies()).set("ref", ref, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax" });
  redirect("/");
}
