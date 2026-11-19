import { auth } from "@/auth";
import { waLink } from "@/lib/whatsapp";
import { logCoffee } from "@/lib/matchlog";
// "Continue on WhatsApp": checks mutual consent, records the click, then redirects to wa.me. The number never appears in page HTML.
export async function GET(req, { params }) {
  const { id } = await params, s = await auth(), back = new URL(`/coffee/${id}`, req.url);
  if (!s?.user?.id) return Response.redirect(new URL("/?next=" + encodeURIComponent(`/coffee/${id}`), req.url), 302);
  const link = await waLink(s.user.id, id); if (!link) return Response.redirect(back, 302);
  await logCoffee(s.user.id, id, "whatsapp_chat_opened", {});
  return new Response(null, { status: 302, headers: { Location: link, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
