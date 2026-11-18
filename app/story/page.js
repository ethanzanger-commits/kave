import { auth } from "@/auth";
import { client } from "@/db";
import { redirect } from "next/navigation";
import Nav from "../Nav";
import SubmitButton from "../SubmitButton";
import { hit } from "@/lib/limit";
import { track } from "@/lib/track";
export const metadata = { title: "Share your story", robots: { index: false } };
export const dynamic = "force-dynamic";
async function submit(fd) {
  "use server";
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent("/story"));
  const body = String(fd.get("body") || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 800);
  if (body.length < 10) redirect("/story?e=short");
  if (!(await hit("story:" + s.user.id, 3, 86400))) redirect("/story?e=limit");
  const first = (s.user.name || "A member").split(" ")[0];
  await client`insert into story ("userId", name, body, consent) values (${s.user.id}, ${first}, ${body}, ${fd.get("consent") === "on"})`;
  await track(s.user.id, "story_submitted");
  redirect("/story?sent=1");
}
export default async function Story({ searchParams }) {
  const s = await auth(); if (!s?.user?.id) redirect("/?next=" + encodeURIComponent("/story"));
  const sp = (await searchParams) || {};
  return (
    <main>
      <Nav />
      <h1>Share your story</h1>
      <p className="lead">Met someone through Kave? Brought a friend in? Tell us what happened, even if it's small.</p>
      {sp.sent && <p className="why" role="status"><b>Thank you.</b> We read every story.</p>}
      {sp.e === "short" && <p className="why" role="alert">Write a little more, at least a sentence.</p>}
      {sp.e === "limit" && <p className="why" role="alert">That's enough stories for today. Thank you.</p>}
      <form action={submit}>
        <label htmlFor="body">Your story</label>
        <textarea id="body" name="body" rows={6} maxLength={800} required placeholder="Who did you meet, or who joined through you? What came out of it?" />
        <label className="check"><input type="checkbox" name="consent" />You may share my story and first name in Kave emails and posts.</label>
        <p><small>We only share stories when you tick the box, and only your first name. We'll check with you if we change a word.</small></p>
        <SubmitButton className="primary" pendingText="Sending…">Send my story</SubmitButton>
      </form>
    </main>
  );
}
