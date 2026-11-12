// Run: npm i --no-save @electric-sql/pglite && node tests/db.test.mjs
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { awardFounding } from "../lib/founding.js";
import { communityStats } from "../lib/community.js";
const mig = fs.readFileSync(new URL("../migrations/kave2.sql", import.meta.url), "utf8");
let pass = 0, fail = 0;
const ok = (c, m) => { (c ? pass++ : fail++); console.log((c ? "PASS " : "FAIL ") + m); };
async function fresh() {
  const pg = new PGlite();
  const q = async (s, ...v) => (await pg.query(s.reduce((a, x, i) => a + "$" + i + x), v)).rows;
  await pg.exec(`create table "user" (id text primary key, name text, email text unique, "emailVerified" timestamp, image text, "createdAt" timestamp default now());
   create table profile ("userId" text primary key, headline text, company text, industry text, neighborhood text, city text, "refCode" text, "invitedBy" text, "isDemo" boolean default false, "ageOk" boolean default false, about text, skills jsonb, "updatedAt" timestamp default now());
   create table event ("userId" text, name text not null, at timestamp default now());`);
  return { pg, q };
}
async function seed(pg, n, opts = {}) {
  for (let i = 1; i <= n; i++) {
    const id = (opts.prefix || "u") + i;
    await pg.query(`insert into "user" (id, name, email, image) values ($1,$2,$3,'data:x')`, [id, "User " + i, id + "@x.com"]);
    await pg.query(`insert into profile ("userId", headline, neighborhood, city, "ageOk", about, skills, "updatedAt") values ($1,'h','Jerusalem','Jerusalem',true,'a','["x"]', now() + ($2 || ' seconds')::interval)`, [id, String(i)]);
  }
}
// 1. Backfill: 55 complete profiles -> exactly 50 numbered, in order
{ const { pg } = await fresh(); await seed(pg, 55); await pg.exec(mig);
  const r = (await pg.query(`select "userId", "foundingNo" from profile where "foundingNo" is not null order by "foundingNo"`)).rows;
  ok(r.length === 50 && r[0].userId === "u1" && r[49].foundingNo === 50 && r[49].userId === "u50", "backfill numbers the first 50 completers in order, 51-55 get none");
  await pg.exec(mig); ok((await pg.query(`select count(*)::int n from profile where "foundingNo" is not null`)).rows[0].n === 50, "migration is safe to run twice");
}
// 2. Sequential awards: 52 users -> 50 numbered, 51st and 52nd null
{ const { pg, q } = await fresh(); await pg.exec(mig.split("-- Give")[0]); await seed(pg, 52);
  const res = []; for (let i = 1; i <= 52; i++) res.push(await awardFounding(q, "u" + i));
  ok(res.slice(0, 50).every((x, i) => x === i + 1), "first 50 get positions 1..50");
  ok(res[50] === null && res[51] === null, "51st and 52nd get no badge");
  ok(await awardFounding(q, "u3") === null, "re-awarding an existing member does not change their number");
  const keep = (await pg.query(`select "foundingNo" from profile where "userId"='u3'`)).rows[0].foundingNo; ok(keep === 3, "founding number is permanent");
  let err = ""; try { await pg.query(`update profile set "foundingNo" = 1 where "userId" = 'u9'`); } catch (e) { err = e.message; }
  ok(/unique|duplicate/i.test(err), "database rejects a duplicate founding number");
  err = ""; try { await pg.query(`update profile set "foundingNo" = 51 where "userId" = 'u60'`); await pg.query(`update profile set "foundingNo" = 51 where "userId" = 'u51'`); } catch (e) { err = e.message; }
  ok(/check/i.test(err), "database rejects position 51");
}
// 3. Simultaneous completion of the same user, and demo users
{ const { pg, q } = await fresh(); await pg.exec(mig.split("-- Give")[0]); await seed(pg, 3); await seed(pg, 1, { prefix: "demo-" });
  const [a, b] = await Promise.all([awardFounding(q, "u1"), awardFounding(q, "u1")]);
  ok([a, b].filter((x) => x === 1).length === 1 && (await pg.query(`select count(*)::int n from profile where "foundingNo"=1`)).rows[0].n === 1, "two simultaneous completions of one user give one position");
  ok(await awardFounding(q, "demo-1") === null, "demo users never get a founding number");
}
// 4. Community counter excludes incomplete, demo, no-photo
{ const { pg, q } = await fresh(); await pg.exec(mig.split("-- Give")[0]); await seed(pg, 15); await seed(pg, 2, { prefix: "demo-" });
  await pg.query(`insert into "user" (id, name, email) values ('nophoto','N','n@x.com')`); await pg.query(`insert into profile ("userId", headline, city, "ageOk", about, skills) values ('nophoto','h','Haifa',true,'a','["x"]')`);
  await pg.query(`insert into "user" (id, name, email, image) values ('noabout','N','n2@x.com','d')`); await pg.query(`insert into profile ("userId", city, "ageOk") values ('noabout','Haifa',true)`);
  const s = await communityStats(q, "50,100,250"); ok(s.count === 15 && s.target === 50 && s.remaining === 35 && s.foundingLeft === 50, `counter shows 15 complete of 50 (got ${s.count}/${s.target}), excludes incomplete and demo`);
  await seed(pg, 40, { prefix: "v" }); const s2 = await communityStats(q, "50,100,250"); ok(s2.count === 55 && s2.target === 100, "counter moves to next milestone after 50");
}
// 4b. City migration + city matching
{ const { pg } = await fresh(); await pg.exec(mig.split("-- Give")[0]);
  const ins = (id, nb, c) => pg.query(`insert into profile ("userId", neighborhood, city) values ($1,$2,$3)`, [id, nb, c]);
  await ins("a", "Rehavia, Jerusalem", null); await ins("b", "Florentin", "Tel Aviv"); await ins("c", "Somewhere odd", null); await ins("d", "x", "Other in Israel"); await ins("e", "Ra'anana center", null);
  const m3 = fs.readFileSync(new URL("../migrations/kave3-cities.sql", import.meta.url), "utf8"); await pg.exec(m3); await pg.exec(m3);
  const g = Object.fromEntries((await pg.query(`select "userId", city, neighborhood from profile`)).rows.map((r) => [r.userId, r]));
  ok(g.a.city === "Jerusalem" && g.a.neighborhood === "Jerusalem", "migration maps Rehavia, Jerusalem to Jerusalem and drops the neighborhood");
  ok(g.b.city === "Tel Aviv-Yafo" && g.e.city === "Ra'anana", "migration normalizes typed cities");
  ok(g.c.city === null && g.c.neighborhood === null, "unmatched places are cleared so the user picks a city");
  ok(g.d.city === "Other in Israel", "migration keeps 'Other in Israel' on a second run");
}
{ const { matchCity, CITIES } = await import("../lib/cities.js");
  ok(matchCity("Rehavia Jerusalem") === "Jerusalem" && matchCity("Tel Aviv District Tel Aviv") === "Tel Aviv-Yafo" && matchCity("Be'er Sheva") === "Beer Sheva" && matchCity("Raanana") === "Ra'anana" && matchCity("Modi'in-Maccabim-Re'ut") === "Modi'in", "reverse-geocoded text maps to preset cities");
  ok(matchCity("Kiryat Gat") === null && CITIES.length === 23, "unknown towns return null; 23 menu options");
}
// 5. Reminder claim is idempotent
{ const { pg } = await fresh(); await pg.exec(mig.split("-- Give")[0]);
  const claim = async () => (await pg.query(`insert into reminder ("userId", step, status) values ('u1', 1, 'queued') on conflict ("userId", step) do nothing returning id`)).rows;
  const a = await claim(), b = await claim(); ok(a.length === 1 && b.length === 0, "a reminder step can be claimed only once");
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
