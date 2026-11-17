import { handlers } from "@/auth";
import { hit } from "@/lib/limit";
export const POST = handlers.POST;
// Six-digit codes are only safe with a cap on guesses: 10 tries per email and 40 per IP address every 15 minutes.
export async function GET(req) {
  const u = new URL(req.url);
  if (u.pathname.endsWith("/callback/nodemailer")) {
    const email = (u.searchParams.get("email") || "").toLowerCase(), ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
    if (!(await hit("verify:" + email, 10, 900)) || !(await hit("verifyip:" + ip, 40, 900))) return new Response("Too many attempts. Please request a new code.", { status: 429 });
  }
  return handlers.GET(req);
}
