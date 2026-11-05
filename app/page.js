import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
export default async function Home() {
  if (await auth()) redirect("/profile");
  const go = (p) => async () => { "use server"; await signIn(p, { redirectTo: "/profile" }); };
  return (
    <main>
      <h1>kave</h1>
      <p>Private beta · Jerusalem first</p>
      <p className="lead">Meet the people you should know, over actual coffee.</p>
      <form action={go("linkedin")}><button className="primary">Continue with LinkedIn</button></form>
      <form action={go("google")}><button>Continue with Google</button></form>
      <form action={async (fd) => { "use server"; await signIn("resend", { email: fd.get("email"), redirectTo: "/profile" }); }}>
        <input name="email" type="email" placeholder="you@company.com" required />
        <button>Continue with email</button>
      </form>
    </main>
  );
}
