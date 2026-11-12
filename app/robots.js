export default function robots() {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/profile", "/matches", "/coffee", "/welcome"] } };
}
