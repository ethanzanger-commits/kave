
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

function getMetadataBase() {
  const raw = (process.env.APP_URL || "https://kave-seven.vercel.app").trim();
  const cleaned = raw.replace(/^\[+|\]+$/g, "").replace(/^["']|["']$/g, "");

  try {
    const url = new URL(cleaned);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Invalid URL protocol");
    }
    return url;
  } catch {
    return new URL("https://kave-seven.vercel.app");
  }
}

export const metadata = {
  metadataBase: getMetadataBase(),
  title: "Kave: meet someone worth knowing, over coffee",
  description:
    "Kave introduces professionals across Israel to people worth meeting, one coffee at a time.",
  openGraph: {
    title: "Kave: meet someone worth knowing, over coffee",
    description: "Professionals across Israel, one good coffee at a time.",
    type: "website",
  },
};

export const viewport = { themeColor: "#fff7f0" };

export default function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
