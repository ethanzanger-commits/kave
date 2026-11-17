export default function robots() {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/profile", "/matches", "/coffee", "/welcome", "/messages", "/contacts", "/around", "/discover"] }, sitemap: (process.env.APP_URL || "https://" + (process.env.VERCEL_PROJECT_PRODUCTION_URL || "kave-seven.vercel.app")) + "/sitemap.xml" };
}
