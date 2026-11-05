import NextAuth from "next-auth";
import LinkedIn from "next-auth/providers/linkedin";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, verificationTokens } from "@/schema";
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, verificationTokensTable: verificationTokens }),
  session: { strategy: "jwt" },
  providers: [LinkedIn({ allowDangerousEmailAccountLinking: true }), Google({ allowDangerousEmailAccountLinking: true }), Resend({ from: process.env.EMAIL_FROM })],
  callbacks: { session({ session, token }) { session.user.id = token.sub; return session; } },
});
