import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export async function GET(req, { params }) {
  const { slug } = await params;
  if (/^[a-z0-9-]{1,40}$/.test(slug)) (await cookies()).set("circle", slug, { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax" });
  redirect("/");
}
