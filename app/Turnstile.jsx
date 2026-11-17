import Script from "next/script";
// Cloudflare Turnstile widget. Adds its token to the surrounding form automatically. Hidden unless the site key is set.
export default function Turnstile() {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!key) return null;
  return (<><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer /><div className="cf-turnstile" data-sitekey={key} data-theme="light" style={{ margin: ".6rem 0" }} /></>);
}
