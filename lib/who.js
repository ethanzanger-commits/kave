import { db } from "@/db";
import { profiles, users } from "@/schema";
import { and, eq, sql } from "drizzle-orm";
// Public share data: first name, headline, city and whether there is a photo, and only for completed (18+) profiles.
export async function who(code) {
  if (!/^[a-z0-9]{4,12}$/.test(code || "")) return null;
  try {
    const [r] = await db.select({ n: users.name, h: profiles.headline, f: profiles.foundingNo, c: profiles.city, i: sql`(${users.image} is not null)`.mapWith(Boolean) }).from(profiles).innerJoin(users, eq(users.id, profiles.userId)).where(and(eq(profiles.refCode, code), eq(profiles.ageOk, true)));
    return r ? { first: (r.n || "A friend").split(" ")[0], headline: r.h || "", founding: r.f, city: r.c || "", hasPhoto: r.i } : null;
  } catch { return null; }
}
