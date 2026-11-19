import { cleanEmail } from "@/lib/email";
import NextAuth from "next-auth";
import LinkedIn from "next-auth/providers/linkedin";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { sendMail } from "@/lib/mail";
import { copy } from "@/lib/emails";
import { recordSignup } from "@/lib/attribution";
import { users, accounts, verificationTokens } from "@/schema";
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, verificationTokensTable: verificationTokens }),
  trustHost: true,
  pages: { verifyRequest: "/check-email", error: "/check-email" },
  events: { createUser: async ({ user }) => { await recordSignup(user); } },
  session: { strategy: "jwt", maxAge: 60 * 24 * 3600, updateAge: 24 * 3600 }, // stay signed in for 60 days
  providers: [...(process.env.AUTH_LINKEDIN_ID ? [LinkedIn({ allowDangerousEmailAccountLinking: true })] : []), ...(process.env.AUTH_GOOGLE_ID ? [Google({ allowDangerousEmailAccountLinking: true })] : []), Nodemailer({ server: { host: "localhost" }, from: process.env.EMAIL_FROM || process.env.GMAIL_USER, maxAge: 30 * 60, generateVerificationToken: () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0"), sendVerificationRequest: async ({ identifier, url, token }) => {
    if (!cleanEmail(identifier)) throw new Error("Invalid email");
    let link = url; try { const u = new URL(url); link = `${u.origin}/signin/confirm?l=${encodeURIComponent(url)}`; } catch {} // tap-to-confirm page: scanners can't burn the token
    const ok = await sendMail(identifier, ...copy("signin", { url: link, code: token }));
    if (!ok) throw new Error("Email failed");
  } })],
  callbacks: { jwt({ token }) { delete token.picture; return token; }, session({ session, token }) { session.user.id = token.sub; return session; } },
});
