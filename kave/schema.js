import { pgTable, text, timestamp, integer, primaryKey, jsonb, boolean } from "drizzle-orm/pg-core";
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"), email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }), image: text("image"), source: text("source"), referredBy: text("referredBy"), createdAt: timestamp("createdAt").defaultNow(),
});
// No access/refresh/id token columns on purpose: kave never keeps LinkedIn tokens.
export const accounts = pgTable("account", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  expires_at: integer("expires_at"), token_type: text("token_type"), scope: text("scope"),
}, (a) => [primaryKey({ columns: [a.provider, a.providerAccountId] })]);
export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(), token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (v) => [primaryKey({ columns: [v.identifier, v.token] })]);
export const profiles = pgTable("profile", {
  userId: text("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  headline: text("headline"), company: text("company"), industry: text("industry"),
  neighborhood: text("neighborhood"), refCode: text("refCode"), invitedBy: text("invitedBy"), isDemo: boolean("isDemo").default(false), ageOk: boolean("ageOk").default(false), about: text("about"), lookingFor: text("lookingFor"), workingOn: text("workingOn"), showOnHome: boolean("showOnHome").default(false), canHelp: text("canHelp"), weekly: boolean("weekly").default(true), freeUntil: timestamp("freeUntil"), foundingNo: integer("foundingNo"), completedAt: timestamp("completedAt"), availability: jsonb("availability"), city: text("city"), linkedinUrl: text("linkedinUrl"),
  skills: jsonb("skills"), experience: jsonb("experience"), education: jsonb("education"),
  updatedAt: timestamp("updatedAt").defaultNow(),
});
export const swipes = pgTable("swipe", { from: text("fromId").notNull(), to: text("toId").notNull(), yes: boolean("yes").notNull(), at: timestamp("at").defaultNow() }, (t) => [primaryKey({ columns: [t.from, t.to] })]);
export const matches = pgTable("match", { id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()), a: text("a").notNull(), b: text("b").notNull(), when: text("whenText"), place: text("place"), met: boolean("met"), status: text("status"), proposedBy: text("proposedBy"), reminded: boolean("reminded"), cheatSent: boolean("cheatSent"), at: timestamp("at").defaultNow() });
export const blocks = pgTable("block", { from: text("fromId").notNull(), to: text("toId").notNull(), reason: text("reason").notNull(), at: timestamp("at").defaultNow() }, (t) => [primaryKey({ columns: [t.from, t.to] })]);
export const thanks = pgTable("thanks", { matchId: text("matchId").notNull(), fromId: text("fromId").notNull(), text: text("text").notNull(), isPublic: boolean("isPublic").default(false), hidden: boolean("hidden").default(false), at: timestamp("at").defaultNow() }, (t) => [primaryKey({ columns: [t.matchId, t.fromId] })]);
export const events = pgTable("event", { userId: text("userId"), name: text("name").notNull(), at: timestamp("at").defaultNow() });
export const messages = pgTable("message", { id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()), matchId: text("matchId").notNull(), fromId: text("fromId").notNull(), text: text("text").notNull(), at: timestamp("at").defaultNow() });
export const intros = pgTable("intro", { id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()), byId: text("byId").notNull(), a: text("a").notNull(), b: text("b").notNull(), note: text("note"), aYes: boolean("aYes"), bYes: boolean("bYes"), at: timestamp("at").defaultNow() });
