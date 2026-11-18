export const metadata = { title: "Not found · Kave", robots: { index: false } };
export default function NotFound() {
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "3rem 1.25rem" }}>
      <h1>We couldn&rsquo;t find that page</h1>
      <p>The link may be old, or the person may no longer be on Kave.</p>
      <p><a href="/discover">Back to Discover</a></p>
    </main>
  );
}
