// Optional PostHog forwarding over plain HTTPS (no new dependency).
// Does nothing unless NEXT_PUBLIC_POSTHOG_KEY is set, and never throws.
// Set NEXT_PUBLIC_POSTHOG_HOST to your region's host (default US: https://us.i.posthog.com).
export const posthogOn = () => Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
export async function capture(distinctId, event, properties = {}) {
  try {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || !distinctId) return false;
    const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");
    const r = await fetch(host + "/capture/", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(2000), body: JSON.stringify({ api_key: key, event, distinct_id: String(distinctId), properties }) });
    return r.ok;
  } catch { return false; }
}
