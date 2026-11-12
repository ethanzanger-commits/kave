import NextAuth from "next-auth";
import LinkedIn from "next-auth/providers/linkedin";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { sendMail } from "@/lib/mail";
import { copy } from "@/lib/emails";
import { users, accounts, verificationTokens } from "@/schema";
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, verificationTokensTable: verificationTokens }),
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [...(process.env.AUTH_LINKEDIN_ID ? [LinkedIn({ allowDangerousEmailAccountLinking: true })] : []), ...(process.env.AUTH_GOOGLE_ID ? [Google({ allowDangerousEmailAccountLinking: true })] : []), Nodemailer({ server: { host: "localhost" }, from: process.env.EMAIL_FROM || process.env.GMAIL_USER, sendVerificationRequest: async ({ identifier, url }) => {
    const ok = await sendMail(identifier, ...copy("signin", { url }));
    if (!ok) throw new Error("Email failed");
  } })],
  callbacks: { jwt({ token }) { delete token.picture; return token; }, session({ session, token }) { session.user.id = token.sub; return session; } },
});
