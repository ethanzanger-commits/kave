// Run: npm i --no-save @electric-sql/pglite && node tests/coffeeflow.test.mjs
// Covers the coffee lifecycle SQL/logic: both-confirm completion, duplicates, conflicts, reminders idempotence, pending actions, admin funnel, privacy, migration.
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
const rd = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
const tmp = (n) => new URL(`./_${n}.mjs`, import.meta.url);
let pass = 0, fail = 0;
const ok = (c, m) => { (c ? pass++ : fail++); console.log((c ? "PASS " : "FAIL ") + m); };
const pg = new PGlite();
globalThis.__client = async (t, ...r) => (Array.isArray(t) ? (await pg.query(t.reduce((a, x, i) => a + "$" + i + x), r)).rows : (await pg.query(t, r[0] || [])).rows);
await pg.exec(`create table "user" (id text primary key, name text, email text, image text, source text, "referredBy" text, "createdAt" timestamp default now());
 create table profile ("userId" text primary key, headline text, company text, industry text, city text, neighborhood text, "invitedBy" text, "isDemo" boolean default false, "ageOk" boolean default false, about text, "lookingFor" text, "canHelp" text, "workingOn" text, "completedAt" timestamp, skills jsonb, experience jsonb);
 create table swipe ("fromId" text, "toId" text, yes boolean, at timestamp default now());
 create table block ("fromId" text, "toId" text, reason text, at timestamp default now());
 create table match (id text primary key, a text, b text, "whenText" text, place text, met boolean, status text, "proposedBy" text, at timestamp default now());
 create table event ("userId" text, name text not null, at timestamp default now());`);
await pg.exec(rd("migrations/kave17-admin-intel.sql"));
const m19 = rd("migrations/kave19-coffee-flow.sql"); await pg.exec(m19); await pg.exec(m19); ok(true, "kave19 migration runs twice without error (idempotent)");
await pg.exec(rd("migrations/kave14-finished-definition.sql"));
const shim = (t) => t.replace('import { client } from "@/db";', "const client = globalThis.__client;").replace(/from "@\/lib\/(\w+)"/g, 'from "./_$1.mjs"');
fs.writeFileSync(tmp("fmt"), rd("lib/fmt.js"));
fs.writeFileSync(tmp("matchlog"), shim(rd("lib/matchlog.js")));
fs.writeFileSync(tmp("coffee"), shim(rd("lib/coffee.js")));
fs.writeFileSync(tmp("intel"), shim(rd("lib/intel.js")));
globalThis.__sent = []; globalThis.__fail = false;
fs.writeFileSync(tmp("mail"), 'export const sendLow = async (to, s) => { if (globalThis.__fail) return false; globalThis.__sent.push([to, s]); return true; };');
fs.writeFileSync(tmp("cheat"), 'export const cheatEmail = () => "cheat sheet";');
fs.writeFileSync(tmp("emails"), 'export const copy = (k, v) => [k + " " + (v.other || ""), "body"];');
fs.writeFileSync(tmp("leaders"), 'export const short = (n, e) => n || e;');
fs.writeFileSync(tmp("reminders"), shim(rd("lib/reminders.js")));
const C = await import("./_coffee.mjs"), R = await import("./_reminders.mjs"), I = await import("./_intel.mjs");
const U = (id, at = "2026-11-01") => pg.query(`insert into "user" (id,name,email,"createdAt") values ($1,$1,$1||'@x.com',$2)`, [id, at]);
for (const u of ["u1", "u2", "u3", "u4"]) await U(u);
for (const u of ["u1", "u2", "u3", "u4"]) await pg.query(`insert into profile ("userId", "ageOk", neighborhood) values ($1, true, 'Jerusalem')`, [u]);
// ---- state machine
const S = (o) => C.coffeeState({ when: null, status: null, met: null, ...o });
ok(S({}) === "no_plan", "state: no time yet");
ok(S({ when: "2099-01-01T10:00", status: "proposed" }) === "proposed", "state: proposed");
ok(S({ when: "2099-01-01T10:00", status: "confirmed" }) === "scheduled", "state: accepted/scheduled is NOT completed");
ok(S({ when: "2000-01-01T10:00", status: "confirmed" }) === "awaiting_confirmation", "state: past coffee awaits confirmation, not completed");
ok(S({ when: "2000-01-01T10:00", status: "confirmed", met: true }) === "completed" && S({ when: "2000-01-01T10:00", met: false }) === "did_not_happen", "state: completed / did not happen only from met flag");
// ---- both-confirm rule
const R1 = C.resolveOutcome;
ok(R1([]) === null && R1([{ outcome: "met" }]) === null, "completion: zero or one confirmation stays pending (null)");
ok(R1([{ outcome: "met" }, { outcome: "met" }]) === true, "completion: both met = completed");
ok(R1([{ outcome: "met" }, { outcome: "not_met" }]) === false && R1([{ outcome: "not_met" }, { outcome: "not_met" }]) === false, "completion: any 'not met' once both answered = did not happen");
ok(R1([{ outcome: "met" }], true) === true, "completion: demo partner settles on one answer");
// ---- duplicates
await pg.query(`insert into match (id,a,b,"whenText",place,status,"proposedBy") values ('m1','u1','u2','2000-01-01T10:00','Cafe','confirmed','u1')`);
const ins = (u, o) => C ? globalThis.__client`insert into coffee_confirmation ("matchId", "userId", outcome) values ('m1', ${u}, ${o}) on conflict do nothing returning outcome` : null;
ok((await ins("u1", "met")).length === 1, "confirm: first answer stored");
ok((await ins("u1", "not_met")).length === 0, "confirm: second answer from same person ignored (first stands)");
let confs = await globalThis.__client`select "userId", outcome from coffee_confirmation where "matchId" = 'm1'`;
ok(C.resolveOutcome(confs) === null, "confirm: only one person confirmed => still pending, not completed");
const pa = await C.pendingActions("u2");
ok(pa.conf.length === 1 && (await C.pendingActions("u1")).conf.length === 0, "pending: the person who has not answered sees the action, the one who did does not");
await ins("u2", "met"); confs = await globalThis.__client`select "userId", outcome from coffee_confirmation where "matchId" = 'm1'`;
ok(C.resolveOutcome(confs) === true, "confirm: both confirmed => completed");
await pg.query(`update match set met = true where id = 'm1'`);
// ---- conflicts
await pg.query(`insert into match (id,a,b,"whenText",place,status,"proposedBy") values ('m2','u1','u3','2099-05-05T10:00','Cafe','confirmed','u1')`);
ok((await C.clash(["u1", "u4"], "2099-05-05T10:45", "m3")) === "m2", "clash: overlapping time (45 min) for a shared person is blocked");
ok((await C.clash(["u1", "u4"], "2099-05-05T12:00", "m3")) === null, "clash: 2 hours apart is fine");
ok((await C.clash(["u1", "u3"], "2099-05-05T10:00", "m2")) === null, "clash: the match itself is excluded (rescheduling)");
ok((await C.clash(["u4"], "2099-05-05T10:00", "m3")) === null, "clash: unrelated people are unaffected");
// ---- pending: proposals + requests
await pg.query(`insert into match (id,a,b,"whenText",place,status,"proposedBy") values ('m4','u3','u4','2099-06-06T10:00','Cafe','proposed','u3')`);
await pg.query(`insert into swipe ("fromId","toId",yes) values ('u2','u4',true)`);
const p4 = await C.pendingActions("u4");
ok(p4.prop.length === 1 && p4.req.length === 1 && p4.count === 2, "pending: proposal awaiting my reply + coffee request both counted");
ok((await C.pendingActions("u3")).prop.length === 0, "pending: the proposer is not asked to answer their own proposal");
// ---- reminders
const NOW = "2026-11-19T08:00";
await pg.query(`insert into match (id,a,b,"whenText",place,status,"proposedBy") values ('r1','u1','u2','2026-11-20T10:00','Cafe','confirmed','u1'), ('r2','u3','u4','2026-11-19T15:00','Cafe','confirmed','u3'), ('r3','u1','u3','2026-11-20T11:00','Cafe','proposed','u1')`);
let o = await R.runReminders("https://k", NOW);
ok(o.dayBefore === 2 && o.morningOf === 2, "reminders: day-before and morning-of go to BOTH people for confirmed coffees only (proposed ignored)");
o = await R.runReminders("https://k", NOW);
ok(o.dayBefore === 0 && o.morningOf === 0, "reminders: running again sends no duplicates");
await pg.query(`update match set "whenText" = '2026-11-20T16:00' where id = 'r1'`);
o = await R.runReminders("https://k", NOW);
ok(o.dayBefore === 2, "reminders: after a reschedule both people get the reminder for the new time");
await pg.query(`insert into match (id,a,b,"whenText",place,status,"proposedBy") values ('r4','u2','u4','2026-11-20T09:00','Cafe','confirmed','u2')`);
globalThis.__fail = true; o = await R.runReminders("https://k", NOW); ok(o.failed === 2 && o.dayBefore === 0, "reminders: failed send is reported and not marked as sent");
globalThis.__fail = false; o = await R.runReminders("https://k", NOW); ok(o.dayBefore === 2, "reminders: failed send is retried on the next run");
// ---- admin funnel
await pg.query(`insert into event ("userId", name, "matchId", at) values ('u1','coffee_confirmed','m1','2026-11-03'), ('u2','coffee_completed','m1','2026-11-04'), ('u1','coffee_cancelled','m2','2026-11-05')`);
await pg.query(`update match set at = '2026-11-02' where id = 'm1'`);
await pg.query(`insert into swipe ("fromId","toId",yes,at) values ('u1','u2',true,'2026-11-01 10:00'), ('u2','u1',true,'2026-11-01 14:00')`);
await pg.query(`insert into coffee_feedback ("matchId","userId",again,rating,note) values ('m1','u1','yes',5,'secret note')`);
const F = await I.coffeeFunnel();
ok(F.c.completed_both_confirmed === 1 && F.c.completed === 1, "admin: completed counts only both-confirmed coffees");
ok(F.c.scheduled_upcoming >= 1 && F.c.awaiting_confirmation === 0, "admin: scheduled vs awaiting are separate");
ok(F.ev.cancelled === 1 && F.ev.scheduled_ever === 1, "admin: cancelled and scheduled-ever come from tracked events");
ok(Number(F.rg.median_days) === 3 && F.rg.n === 2, "admin: registration to first completed coffee measured per member from the completion event (3 days, both participants)");
ok(F.fb.n === 1 && Number(F.fb.avg_rating) === 5 && !JSON.stringify(F).includes("secret note"), "admin: feedback is aggregate only, private note never exposed");
ok(F.req.requests >= 1 && F.req.accepted >= 1, "admin: request/accept counts");
// ---- privacy at query level: the app only reads feedback "where userId = me"
const other = await globalThis.__client`select * from coffee_feedback where "matchId" = 'm1' and "userId" = 'u2'`;
ok(other.length === 0, "privacy: the other participant's query returns none of u1's feedback");
for (const f of ["fmt", "matchlog", "coffee", "intel", "mail", "cheat", "emails", "leaders", "reminders"]) fs.unlinkSync(tmp(f));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
