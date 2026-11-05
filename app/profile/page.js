import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { profiles, accounts } from "@/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ProfileForm from "../ProfileForm";
import { disconnectLinkedIn } from "../actions";
export default async function Profile() {
  const s = await auth(); if (!s) redirect("/");
  const id = s.user.id;
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, id));
  const linked = (await db.select().from(accounts).where(and(eq(accounts.userId, id), eq(accounts.provider, "linkedin")))).length > 0;
  return (
    <main>
      <div className="who">
        {s.user.image && <img src={s.user.image} alt="" width="56" height="56" referrerPolicy="no-referrer" />}
        <div><h1>{s.user.name || "Welcome"}</h1>
          {linked && <span className="badge">Connected with LinkedIn</span>}</div>
      </div>
      <nav><a href="/discover">Discover</a><a href="/matches">My coffees</a><a href="/around">Who's around</a></nav>
      {p?.linkedinUrl && <a href={p.linkedinUrl} target="_blank" rel="noopener noreferrer">View LinkedIn profile</a>}
      <ProfileForm initial={p ? { ...p, updatedAt: undefined, userId: undefined } : {}} />
      <div className="row">
        {linked && <form action={disconnectLinkedIn}><button>Disconnect LinkedIn</button></form>}
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button>Sign out</button></form>
      </div>
    </main>
  );
}
