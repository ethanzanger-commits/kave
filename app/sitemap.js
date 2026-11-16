import { CITIES } from "@/lib/cities";
const slugOf = (c) => c.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
export default function sitemap() {
  const base = process.env.APP_URL || "https://" + (process.env.VERCEL_PROJECT_PRODUCTION_URL || "kave-seven.vercel.app");
  return [...["", "/how-to", "/contact", "/privacy", "/terms"].map((p) => ({ url: base + p })), ...CITIES.map((c) => ({ url: `${base}/city/${slugOf(c)}` }))];
}
