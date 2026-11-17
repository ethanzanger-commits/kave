// Run: npm i --no-save @electric-sql/pglite && node tests/leaders.test.mjs
import { PGlite } from "@electric-sql/pglite";
import { board, finalizeMonth, winnerMap, monthKey, prevMonthKey, short } from "../lib/leaders.js";
const pg = new PGlite(); const q = async (s, ...v) => (await pg.query(s.reduce((a, x, i) => a + "$" + i + x), v)).rows;
await pg.exec(`create table "user" (id text primary key, name text, email text);
create table profile ("userId" text primary key, "invitedBy" text, "ageOk" boolean default false, "completedAt" timestamp);
create table match (id text primary key default gen_random_uuid()::text, a text, b text, "whenText" text, met boolean);
create table monthly_winner (month text not null, category text not null, "userId" text not null, count int not null, at timestamp default now(), primary key (month, category));`);
for (const [id, n] of [["ann","Ann Lee"],["bob","Bob Ray"],["cy","Cy Ng"],["demo-1","Demo"],["f1","F One"],["f2","F Two"],["f3","F Three"],["f4","F Four"],["f5","F Five"],["f6","F Six"],["f7","F Seven"]]) await pg.query(`insert into "user" (id, name) values ($1,$2)`, [id, n]);
const prof = (id, by, at) => pg.query(`insert into profile values ($1,$2,true,$3)`, [id, by, at]);
for (const id of ["ann","bob","cy","demo-1"]) await prof(id, null, "2026-10-01 10:00");
await prof("f1","ann","2026-10-05 10:00"); await prof("f2","ann","2026-10-06 10:00"); await prof("f3","bob","2026-10-07 10:00");
await prof("f4","demo-1","2026-10-08 10:00");           // demo inviter excluded
await prof("f5","ann","2026-10-31 22:30");              // Nov 1 00:30 Israel time -> counts for November
await prof("f6","bob","2026-11-02 10:00"); await prof("f7","bob","2026-11-03 10:00"); // November
for (const [a, b, w] of [["ann","bob","2026-10-10T09:00"],["ann","cy","2026-10-12T09:00"],["bob","cy","2026-10-20T09:00"]]) await pg.query(`insert into match (a,b,"whenText",met) values ($1,$2,$3,true)`, [a, b, w]);
await pg.query(`insert into match (a,b,"whenText",met) values ('ann','demo-1','2026-10-15T09:00',true),('ann','cy','2026-10-25T09:00',false)`);
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + m); };
const inv = await board(q, "invites", "2026-10"), cof = await board(q, "coffees", "2026-10"), nov = await board(q, "invites", "2026-11");
ok(inv.length === 2 && inv[0].id === "ann" && inv[0].c === 2 && inv[1].id === "bob" && inv[1].c === 1, "invites board counts converted invites in the month, excludes demo inviters, and respects Israel-time month boundary");
ok(cof.length === 3 && cof.every((r) => r.c === 2), "coffee board counts only confirmed-happened coffees and ignores coffees with demo users");
ok(nov.find((r) => r.id === "bob").c === 2 && nov.find((r) => r.id === "ann").c === 1, "an invite completed at 00:30 Israel time on Nov 1 counts for November");
await finalizeMonth(q, "2026-10"); await finalizeMonth(q, "2026-10");
const w = (await q`select category, "userId", count from monthly_winner order by category`);
ok(w.length === 2 && w[0].category === "coffees" && w[1].category === "invites" && w[1].userId === "ann", "winners recorded once per category and month (re-run is safe)");
const map = await winnerMap(q, new Date("2026-11-15T10:00:00Z"));
ok(map.ann?.includes("invites") && map.ann?.includes("coffees") === (w[0].userId === "ann") , "winner flair applies during the following month");
ok((await winnerMap(q, new Date("2026-12-15T10:00:00Z"))).ann === undefined, "flair ends after that month");
ok(prevMonthKey(new Date("2027-01-10T10:00:00Z")) === "2026-12" && monthKey(new Date("2026-10-31T22:30:00Z")) === "2026-11" && short("Ann Marie Lee") === "Ann L." && short(null, "dana.cohen@x.com") === "Dana C." && short("", "ethanzanger@x.com") === "Member" && short("dana") === "Dana", "month and name helpers, with email fallback");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
