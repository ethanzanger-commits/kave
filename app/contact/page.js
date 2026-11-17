import { auth } from "@/auth";
import Nav from "../Nav";
import ContactForm from "../ContactForm";
export const metadata = { title: "Contact · Kave", description: "Questions, bugs, ideas or something to report? Send the Kave team a note." };
export default async function Contact() {
  const s = await auth();
  return (
    <main>
      <Nav />
      <h1>Talk to us</h1>
      <p className="lead">Questions, bugs, ideas, or something to report? A real person reads every message and replies within two working days.</p>
      <ContactForm name={s?.user?.name || ""} email={s?.user?.email || ""} />
      <p><small>Looking for answers first? See <a href="/how-to">How it works</a>.</small></p>
    </main>
  );
}
