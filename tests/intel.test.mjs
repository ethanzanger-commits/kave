// Run: npm i --no-save @electric-sql/pglite && node tests/intel.test.mjs
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
const rd = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
let pass = 0, fail = 0;
const ok = (c, m) => { (c ? pass++ : fail++); console.log((c ? "PASS " : "FAIL ") + m); };
const pg = new PGlite();
globalThis.__client = async (t, ...r) => (Array.isArray(t) ? (await pg.query(t.reduce((a, x, i) => a + "$" + i + x), r)).rows : (await pg.query(t, r[0] || [])).rows); // supports both neon call styles
await pg.exec(`create table "user" (id text primary key, name text, email text, image text, source text, "referredBy" text, "createdAt" timestamp default now());
 create table profile ("userId" text primary key, headline text, company text, industry text, city text, "invitedBy" text, "isDemo" boolean default false, "ageOk" boolean default false, about text, "lookingFor" text, "canHelp" text, "completedAt" timestamp, skills jsonb, experience jsonb);
 create table swipe ("fromId" text, "toId" text, yes boolean, at timestamp default now());
 create table match (id text primary key, a text, b text, "whenText" text, place text, met boolean, status text, "proposedBy" text, at timestamp default now());
 create table message (id text primary key default gen_random_uuid()::text, "matchId" text, "fromId" text, text text, at timestamp default now());
 create table thanks ("matchId" text, "fromId" text, text text, at timestamp default now());
 create table event ("userId" text, name text not null, at timestamp default now());
 create table signup_attr ("userId" text primary key, source text, ref text, "referrerId" text, at timestamp default now());`);
const m17 = rd("migrations/kave17-admin-intel.sql");
await pg.exec(m17); await pg.exec(m17); ok(true, "kave17 migration runs twice without error (idempotent)");
await pg.exec(rd("migrations/kave14-finished-definition.sql"));
const shim = (t) => t.replace('import { client } from "@/db";', "const client = globalThis.__client;");
for (const f of ["intel", "matchlog", "csv"]) fs.writeFileSync(new URL(`./_${f}.mjs`, import.meta.url), shim(rd(`lib/${f}.js`)).replace(/from "@\/db"/g, ""));
const I = await import("./_intel.mjs"), L = await import("./_matchlog.mjs"), C = await import("./_csv.mjs");
const U = (id, o = {}) => pg.query(`insert into "user" (id,name,email,image,source,"referredBy","createdAt") values ($1,$2,$3,'x',$4,$5,$6)`, [id, o.name || id, id + "@x.com", o.src || null, o.ref || null, o.at || "2026-11-01"]);
const P = (id, city, done = true, o = {}) => pg.query(`insert into profile ("userId",headline,industry,city,"ageOk",about,skills,"completedAt","invitedBy",experience) values ($1,'h',$2,$3,true,$4,$5,$6,$7,$8)`, [id, o.ind || "SaaS", city, done ? "a" : "", done ? '["x"]' : "[]", done ? "2026-11-02" : null, o.inv || null, o.exp || null]);
await U("a", { src: "linkedin" }); await P("a", "Jerusalem"); await U("b", { src: "whatsapp", ref: "a" }); await P("b", "Tel Aviv", true, { exp: '[{"t":1},{"t":2}]' });
await U("c", { src: "linkedin" }); await P("c", "Jerusalem", false); await U("d", { at: "2025-01-01" }); await U("demo-1"); await P("demo-1", "Jerusalem");
await pg.query(`insert into swipe ("fromId","toId",yes) values ('a','b',true),('b','a',true),('c','a',false),('a','c',true)`);
const M = (id, a, b, st, when, met, at = "2026-11-05") => pg.query(`insert into match (id,a,b,"whenText",met,status,at) values ($1,$2,$3,$4,$5,$6,$7)`, [id, a, b, when, met, st, at]);
await M("m1", "a", "b", "confirmed", "Sun 10", null); await M("m2", "a", "c", "proposed", "Mon 9", null); await M("m3", "b", "c", null, null, true); await M("m4", "a", "demo-1", null, null, null); await M("m5", "b", "a", null, null, null);
// users
let r = await I.users(I.NOFILTER);
ok(r.length === 4 && !r.some((x) => x.user_id.startsWith("demo")), "users: demo excluded, 4 real users");
ok(r.every((x) => x.seniority === "unavailable" && x.languages === "unavailable"), "users: seniority/languages shown as unavailable");
ok((await I.users({ ...I.NOFILTER, city: "Jerusalem" })).length === 2, "users: city filter");
ok((await I.users({ ...I.NOFILTER, source: "linkedin", complete: "yes" })).length === 1, "users: source + finished filter");
ok((await I.users({ ...I.NOFILTER, q: "b@x" })).length === 1 && (await I.users({ ...I.NOFILTER, from: "2026-01-01" })).length === 3, "users: search and date filter");
ok(r.find((x) => x.user_id === "b").experience_entries === 2 && r.find((x) => x.user_id === "a").experience_entries === null, "users: experience count, null when absent");
ok(!JSON.stringify(r).includes("token") && !("password" in r[0]), "users: no secrets in columns");
// matches: never infer completed from confirmed
r = await I.matches(I.NOFILTER);
const st = Object.fromEntries(r.map((x) => [x.match_id, x.coffee_state]));
ok(r.length === 4 && st.m1 === "confirmed" && st.m2 === "proposed_unconfirmed" && st.m3 === "completed" && st.m5 === "no_plan_yet", "matches: states correct; confirmed is NOT completed; demo match excluded");
ok(r.every((x) => x.cancellations === null && x.first_proposed_at === null), "matches: untracked history is null, not 0");
// tracking
await L.logCoffee("a", "m1", "coffee_proposed", { when: "Sun 10" }); await L.logCoffee("a", "m1", "coffee_proposed", { when: "Sun 10" });
ok((await pg.query(`select * from event where "matchId"='m1'`)).rows.length === 1, "log: duplicate within 30s ignored");
await L.logCoffee("b", "m1", "coffee_confirmed", {}); await L.logCoffee("a", "m1", "coffee_cancelled", {}); await L.logCoffee("a", "m1", "coffee_completed", {}, "completed:m1");
await pg.query(`update event set at = at + interval '3 hours' where name='coffee_confirmed'`);
await L.logCoffee("a", "m1", "coffee_completed", {}, "completed:m1"); await L.logCoffee("demo-1", "m4", "coffee_proposed", {});
ok((await pg.query(`select * from event where name='coffee_completed'`)).rows.length === 1, "log: once-ever key respected");
ok((await pg.query(`select * from event where "userId"='demo-1'`)).rows.length === 0, "log: demo users never logged");
await pg.query(`update event set at = '2026-11-06 10:00' where name='coffee_proposed'`); await pg.query(`update event set at = '2026-11-06 13:00' where name='coffee_confirmed'`);
r = (await I.matches(I.NOFILTER)).find((x) => x.match_id === "m1");
ok(r.cancellations === 1 && r.reschedules === 0 && Number(r.hours_proposal_to_confirmation) === 3 && r.confirmed_at, "matches: tracked counts and response times from events");
ok((await I.matches({ ...I.NOFILTER, state: "completed" })).length === 1, "matches: state filter");
// coffee activity
r = await I.coffeeActivity(I.NOFILTER);
ok(r.some((x) => x.record_type === "tracked_event") && r.filter((x) => x.record_type === "current_state_snapshot").every((x) => x.event_at === null), "coffee activity: snapshots carry no invented timestamp");
// overview
const o = await I.overview(I.NOFILTER);
ok(o.k.registrations === 4 && o.k.matches_generated === 4 && o.k.coffee_requests === 3 && o.k.passes === 1, "overview: registrations, matches, requests, passes");
ok(o.states.completed === 1 && o.states.confirmed === 1 && o.funnel.completed_coffee === 2 && o.funnel.registered === 4, "overview: states and funnel");
ok(o.referrals.n === 1 && o.referrals.conv === 1 && o.ev.cancelled === 1 && o.trackedSince, "overview: referrals and tracked events");
// engagement / referrals / network
r = await I.engagement(I.NOFILTER); ok(r.length === 4 && r.find((x) => x.user_id === "a").coffees_completed === 0 && r.find((x) => x.user_id === "b").coffees_completed === 1, "engagement: per-user counts");
r = await I.referrals(I.NOFILTER); ok(r.length === 1 && r[0].referrer_user_id === "a" && r[0].converted_to_complete_profile === true, "referrals: referrer and conversion");
r = await I.network(I.NOFILTER); ok(r.some((x) => x.dimension === "seniority" && x.value === "unavailable" && x.complete_profiles === null) && r.some((x) => x.dimension === "city" && x.value === "Jerusalem"), "network: composition + unavailable dimensions");
// csv
const csv = C.toCsv([{ n: '=HYPERLINK("x")', t: 'a,"b"' }], ["n", "t"], new Date("2026-11-18T00:00:00Z"));
ok(csv.startsWith("\uFEFF") && csv.includes("\r\n") && csv.includes("'=HYPERLINK") && csv.includes('"a,""b"""') && csv.includes("exported_at") && csv.includes("2026-11-18T00:00:00.000Z"), "csv: BOM, CRLF, escaping, formula guard, export timestamp");
// authorization (static + live checked separately)
const route = rd("app/admin/intelligence/export/route.js"), page = rd("app/admin/intelligence/page.js");
ok(/403/.test(route) && /ADMIN_EMAIL/.test(route) && /requireAdmin\(\)/.test(page), "authz: export route returns 403, page uses requireAdmin");
for (const f of ["intel", "matchlog", "csv"]) fs.unlinkSync(new URL(`./_${f}.mjs`, import.meta.url));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
