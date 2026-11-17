export const metadata = { title: "Privacy · kave" };
export default function Privacy() {
  return (
    <main>
      <h1>Privacy</h1>
      <p>kave helps people meet for coffee. This is what we handle and why. Last updated: November 2026.</p>
      <h2>What we store</h2>
      <p>Your name, email and profile photo link from the sign-in you choose; the city, headline, company, industry, skills, work history and education you add; a LinkedIn link only if you type one in; your coffee requests, matches, and the time and café you agree on.</p>
      <h2>What we don't store</h2>
      <p>Your GPS coordinates (we turn them into a city name and discard them), CV or LinkedIn export files (they are read to fill in your profile, then discarded), and LinkedIn or Google access tokens.</p>
      <h2>Who sees it</h2>
      <p>Other members see your first name, headline and city. Monthly leaderboards show your first name, last initial and a count. Your full name, work history and skills are shown only to people you match with. A coffee card you share shows first names, time and café only. We don't sell your data or show ads.</p>
      <h2>Services we use</h2>
      <p>Hosting (Vercel), database (Neon), email delivery (Gmail), OpenStreetMap to find your area and nearby cafés, and Google Maps to show your meeting café on a map, and Formspree to receive messages you send through the contact form. If CV reading with AI is switched on, the text of the CV you upload is sent to Anthropic to extract your profile fields.</p>
      <h2>Usage stats</h2>
      <p>We count key actions (such as signing up or booking a coffee) and anonymous page visits to improve kave. Action counts are tied to your account and deleted with it.</p>
      <h2>Your choices</h2>
      <p>You can edit your profile, disconnect LinkedIn, or delete your account and all your data from your Profile page at any time.</p>
      <h2>Contact</h2>
      <p>{process.env.ADMIN_EMAIL || "the kave team"}</p>
    </main>
  );
}
