import { auth } from "@/auth";
import { redirect } from "next/navigation";
export async function requireAdmin() {
  const s = await auth();
  if (!s || !process.env.ADMIN_EMAIL || s.user.email !== process.env.ADMIN_EMAIL) redirect("/");
  return s;
}
