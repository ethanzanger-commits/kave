import { auth } from "@/auth";
import { db } from "@/db";
import { profiles } from "@/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Nav from "../Nav";
import ContactsUpload from "./ContactsUpload";
export const metadata = { title: "Contacts on Kave" };
export default async function Contacts() {
  const s = await auth(); if (!s?.user?.id) redirect("/");
  const [me] = await db.select().from(profiles).where(eq(profiles.userId, s.user.id));
  if (!me?.refCode) redirect("/profile");
  const invite = `https://${(await headers()).get("host")}/join?ref=${me.refCode}`;
  return (
    <main>
      <Nav />
      <h1>Contacts on Kave</h1>
      <p className="lead">See which of your LinkedIn connections are already here.</p>
      <ol>
        <li>On LinkedIn, open Settings, then Data privacy, then Get a copy of your data.</li>
        <li>Choose Connections, request the file, and download it when LinkedIn emails you (usually within minutes).</li>
        <li>Upload it below.</li>
      </ol>
      <p><small>Your file is read in your browser session and thrown away. We never store your contacts.</small></p>
      <ContactsUpload invite={invite} />
    </main>
  );
}
