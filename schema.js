import { pgTable, text, timestamp, integer, primaryKey, jsonb, boolean } from "drizzle-orm/pg-core";
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"), email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }), image: text("image"),
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
  neighborhood: text("neighborhood"), refCode: text("refCode"), invitedBy: text("invitedBy"), isDemo: boolean("isDemo").default(false), linkedinUrl: text("linkedinUrl"),
  skills: jsonb("skills"), experience: jsonb("experience"), education: jsonb("education"),
  updatedAt: timestamp("updatedAt").defaultNow(),
});
export const swipes = pgTable("swipe", { from: text("fromId").notNull(), to: text("toId").notNull(), yes: boolean("yes").notNull(), at: timestamp("at").defaultNow() }, (t) => [primaryKey({ columns: [t.from, t.to] })]);
export const matches = pgTable("match", { id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()), a: text("a").notNull(), b: text("b").notNull(), when: text("whenText"), place: text("place"), at: timestamp("at").defaultNow() });
