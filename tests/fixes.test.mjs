// Run: npm i --no-save @electric-sql/pglite && node tests/fixes.test.mjs
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import fs from "fs";
const rd = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
const tmp = (n) => new URL(`./_${n}.mjs`, import.meta.url);
let pass = 0, fail = 0;
const ok = (c, m) => { (c ? pass++ : fail++); console.log((c ? "PASS " : "FAIL ") + m); };
// ---- email check
fs.writeFileSync(tmp("email"), rd("lib/email.js"));
const { cleanEmail } = await import("./_email.mjs");
ok(cleanEmail(" Ethan@Example.COM ") === "ethan@example.com", "email: valid address is trimmed and lowercased");
for (const bad of ["a@b.com, c@d.com", "a@b.com>", "x(comment)@b.com", '"a b"@b.com', "victim@evil.com\uFF20attacker.com", "ab@b", "a b@c.com", "a@b.com;c@d.com", "ünï@b.com", "a@b..com", ""])
  ok(cleanEmail(bad) === null, `email: rejects ${JSON.stringify(bad)}`);
// ---- Israel-time helpers
fs.writeFileSync(tmp("fmt"), rd("lib/fmt.js"));
const F = await import("./_fmt.mjs");
ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(F.nowIL()), "fmt: nowIL has the booked-time shape");
ok(F.isPast("2000-01-01T10:00") === true && F.isPast("2999-01-01T10:00") === false, "fmt: isPast works for booked times");
// ---- DB
const pg = new PGlite(); const db = drizzle(pg);
await pg.exec(`create table "user" (id text primary key, name text, email text, image text, source text, "referredBy" text, "createdAt" timestamp default now());
 create table match (id text primary key, a text, b text, "whenText" text, place text, met boolean, status text, "proposedBy" text, at timestamp default now());
 create table event ("userId" text, name text not null, at timestamp default now(), "matchId" text, meta jsonb, key text);
 create table block ("fromId" text not null, "toId" text not null, reason text not null, at timestamp default now(), primary key ("fromId","toId"));`);
await pg.exec(rd("migrations/kave17-admin-intel.sql"));
// unique match migration
const m18 = rd("migrations/kave18-unique-match.sql");
await pg.query(`insert into match (id,a,b) values ('d1','a','b'),('d2','b','a')`);
await pg.exec(m18);
ok((await pg.query(`select 1 from pg_indexes where indexname='match_pair_uq'`)).rows.length === 0, "migration 18: skipped (not failed) when duplicate matches exist");
await pg.query(`delete from match`); await pg.exec(m18); await pg.exec(m18);
ok((await pg.query(`select 1 from pg_indexes where indexname='match_pair_uq'`)).rows.length === 1, "migration 18: index created on clean data, and runs twice safely");
await pg.query(`insert into match (id,a,b) values ('x1','a','b')`);
let dup = false; try { await pg.query(`insert into match (id,a,b) values ('x2','b','a')`); } catch { dup = true; }
ok(dup, "migration 18: reversed duplicate pair is rejected");
ok((await pg.query(`insert into match (id,a,b) values ('x3','b','a') on conflict do nothing returning id`)).rows.length === 0, "swipe: ON CONFLICT DO NOTHING quietly drops the duplicate match");
await pg.query(`delete from match`);
// block guard (real drizzle against in-memory db)
fs.writeFileSync(tmp("guard"), rd("lib/guard.js").replace('import { db } from "@/db";', "const db = globalThis.__db;").replace('from "@/schema"', 'from "../schema.js"'));
globalThis.__db = db; const G = await import("./_guard.mjs");
await pg.query(`insert into block ("fromId","toId",reason) values ('a','b','block')`);
ok((await G.blockedBetween("a", "b")) && (await G.blockedBetween("b", "a")) && !(await G.blockedBetween("a", "c")) && !(await G.blockedBetween(null, "a")), "guard: block works in both directions, no false positives");
// nudges
const sent = []; globalThis.__db2 = null;
const shim = rd("lib/nudges.js").replace('import { client } from "@/db";', "const client = globalThis.__client;").replace('import { sendTemplate } from "@/lib/emails";', "const sendTemplate = async (to, k, v) => globalThis.__sent.push([to, k, v.other, v.when]);").replace('import { fmt } from "@/lib/fmt";', "const fmt = (w) => w;").replace('import { short } from "@/lib/leaders";', "const short = (n, e) => n || e;");
globalThis.__sent = sent; globalThis.__client = async (t, ...r) => (await pg.query(t.reduce((a, x, i) => a + "$" + i + x), r)).rows;
fs.writeFileSync(tmp("nudges"), shim); const N = await import("./_nudges.mjs");
for (const [i, n] of [["u1", "Ann"], ["u2", "Ben"], ["u3", "Cy"], ["u4", "Di"], ["u5", "Ed"], ["u6", "Flo"], ["demo-1", "Demo"]]) await pg.query(`insert into "user" (id,name,email) values ($1,$2,$3)`, [i, n, i + "@x.com"]);
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const il = (h) => new Date(Date.now() + h * 3600e3).toLocaleString("sv-SE", { timeZone: "Asia/Jerusalem" }).replace(" ", "T").slice(0, 16);
const M = (id, a, b, o) => pg.query(`insert into match (id,a,b,"whenText",status,"proposedBy",met,at) values ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, a, b, o.w || null, o.s || null, o.by || null, o.met ?? null, o.at || ago(100)]);
await M("p1", "u1", "u2", {});                                  // matched 100h ago, no plan -> plan nudge
await M("p2", "u3", "u4", { at: ago(5) });                      // fresh match -> nothing
await M("r1", "u1", "u3", { w: il(48), s: "proposed", by: "u1" }); await pg.query(`insert into event ("userId",name,"matchId",at) values ('u1','coffee_proposed','r1',$1)`, [ago(48)]); // old proposal -> reply nudge to u3
await M("r2", "u2", "u4", { w: il(48), s: "proposed", by: "u2" }); await pg.query(`insert into event ("userId",name,"matchId",at) values ('u2','coffee_proposed','r2',$1)`, [ago(2)]); // fresh proposal -> nothing
await M("m1", "u5", "u6", { w: il(-6), s: "confirmed" });       // coffee was 6h ago -> met nudge
await M("m2", "u5", "u2", { w: il(-6), s: "confirmed", met: true }); // already answered -> nothing
await M("m3", "u6", "u3", { w: il(-1), s: "confirmed" });       // only 1h ago -> nothing yet
await M("dm", "demo-1", "u1", {});                              // demo -> never
const r1 = await N.runNudges("https://x");
ok(r1.plan === 1 && r1.reply === 1 && r1.met === 1, `nudges: one of each kind (${JSON.stringify(r1)})`);
const to = (k) => sent.filter((s) => s[1] === k).map((s) => s[0]).sort().join();
ok(to("nudgePlan") === "u1@x.com,u2@x.com", "nudges: plan nudge goes to both people");
ok(to("nudgeReply") === "u3@x.com", "nudges: reply nudge goes only to the person who did NOT propose");
ok(to("nudgeMet") === "u5@x.com,u6@x.com", "nudges: 'did it happen' goes to both, not for answered/recent/demo matches");
const before = sent.length; const r2 = await N.runNudges("https://x");
ok(sent.length === before && r2.plan + r2.reply + r2.met === 0, "nudges: running again sends nothing (once-only)");
ok((await pg.query(`select count(*)::int n from event where "userId"='system'`)).rows[0].n === 3, "nudges: recorded as system events, not member activity");
// landing page after sign-in
await pg.exec(`create table profile ("userId" text primary key, "completedAt" timestamp);
 create view complete_member as select u.id from "user" u join profile p on p."userId" = u.id where p."completedAt" is not null`);
fs.writeFileSync(tmp("landing"), rd("lib/landing.js").replace('import { client } from "@/db";', "const client = globalThis.__client;"));
const LD = await import("./_landing.mjs");
await pg.query(`insert into profile ("userId","completedAt") values ('u1', now())`);
ok((await LD.landing("u1@x.com")) === "/discover" && (await LD.landing("u2@x.com")) === "/profile" && (await LD.landing("new@x.com")) === "/profile", "landing: finished member -> /discover, others -> /profile");
for (const f of ["email", "fmt", "guard", "nudges", "landing"]) fs.unlinkSync(tmp(f));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
