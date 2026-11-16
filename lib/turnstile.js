// Cloudflare Turnstile check. If the keys are not set, sign-up works as before.
export async function verifyTurnstile(fd, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return true;
  const token = fd.get("cf-turnstile-response");
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: String(token) }); if (ip) body.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(5000) });
    return !!(await r.json()).success;
  } catch { return true; } // If Cloudflare is unreachable, let real people in rather than block everyone.
}
