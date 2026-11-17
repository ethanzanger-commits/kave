import { client } from "@/db";
// Serves a member's photo only if they opted in to showing it on the homepage.
export async function GET(req, { params }) {
  const { id } = await params;
  const [r] = await client`select u.image from profile p join "user" u on u.id = p."userId" where p."userId" = ${id} and p."showOnHome" and p."ageOk" and u.image is not null`;
  if (!r) return new Response("Not found", { status: 404 });
  const m = /^data:(image\/jpeg);base64,(.+)$/.exec(r.image);
  if (!m) return Response.redirect(r.image, 302);
  return new Response(Buffer.from(m[2], "base64"), { headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=3600" } });
}
