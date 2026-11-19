// Run: npm i --no-save @electric-sql/pglite && node tests/whatsapp.test.mjs
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
let pass = 0, fail = 0; const ok = (c, m) => { (c ? pass++ : fail++); console.log((c ? "PASS " : "FAIL ") + m); };
const rd = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
const pg = new PGlite();
globalThis.__client = async (t, ...r) => (Array.isArray(t) ? (await pg.query(t.reduce((a, x, i) => a + "$" + i + x), r)).rows : (await pg.query(t, r[0] || [])).rows);
await pg.exec(`create table match (id text primary key, a text, b text); create table block ("fromId" text, "toId" text);`);
const m20 = rd("migrations/kave20-whatsapp-connect.sql"); await pg.exec(m20); await pg.exec(m20); ok(true, "kave20 migration runs twice (idempotent)");
const f = new URL("./_wa.mjs", import.meta.url); fs.writeFileSync(f, rd("lib/whatsapp.js").replace('import { client } from "@/db";', "const client = globalThis.__client;"));
const W = await import("./_wa.mjs");
// phone normalisation
const n = W.normalizePhone;
ok(n("050-123-4567") === "972501234567" && n("+972 50 123 4567") === "972501234567", "phone: Israeli local and +972 formats normalise");
ok(n("+1 (212) 555-0100") === "12125550100" && n("0044 20 7946 0958") === "442079460958", "phone: international formats normalise");
ok(n("abc") === null && n("123") === null && n("") === null && n("+0123456789") === null, "phone: junk and too-short numbers rejected");
await pg.query(`insert into match values ('m1','A','B'), ('m2','A','C')`);
// nobody consented yet
ok((await W.waLink("A", "m1")) === null && (await W.waLink("B", "m1")) === null, "no consent: no link for either person");
// A needs a number first
ok((await W.shareConsent("m1", "A", "")) === "need_phone", "A without a saved number must add one");
ok((await W.shareConsent("m1", "A", "nope")) === "invalid", "A with an invalid number is rejected");
ok((await W.shareConsent("m1", "A", "050 111 1111")) === "requested", "A opts in first => requested");
ok((await W.shareConsent("m1", "A", "")) === "noop", "A opting in twice is a no-op (no duplicate event)");
ok((await W.waLink("A", "m1")) === null && (await W.waLink("B", "m1")) === null, "one-sided consent: NEITHER person gets a link or number");
let st = await W.waStates("B", ["m1"]);
ok(st.m1.theirs === "shared" && st.m1.mine === "none" && !st.m1.mutual && JSON.stringify(st).match(/\d{9}/) === null, "B sees that A wants to connect, but state contains no number");
ok((await W.shareConsent("m1", "B", "+1 212 555 0100")) === "accepted", "B opts in => accepted (mutual)");
const la = await W.waLink("A", "m1"), lb = await W.waLink("B", "m1");
ok(la === "https://wa.me/12125550100?text=" + encodeURIComponent("Hey! We matched on Kave. Looking forward to connecting and arranging a coffee!"), "mutual: A gets B's number with the prefilled intro");
ok(lb && lb.startsWith("https://wa.me/972501111111?text=") && !lb.includes("12125550100"), "mutual: B gets A's number, never their own");
ok((await W.waLink("Z", "m1")) === null, "a stranger gets nothing");
// withdraw
ok((await W.withdrawConsent("m1", "A")) === true, "A withdraws consent");
ok((await W.waLink("A", "m1")) === null && (await W.waLink("B", "m1")) === null, "after withdrawal: neither person can reach a number");
ok((await W.withdrawConsent("m1", "A")) === false, "withdrawing twice does nothing");
ok((await W.shareConsent("m1", "A", "")) === "accepted", "A can opt in again later (number was kept) and it is mutual again");
await W.withdrawConsent("m1", "B", true);
ok((await W.waLink("A", "m1")) === null && (await pg.query(`select 1 from member_phone where "userId"='B'`)).rows.length === 0, "withdraw + erase deletes B's saved number");
// consent is per match
ok((await W.shareConsent("m2", "A", "")) === "requested" && (await W.waLink("A", "m2")) === null, "consent is per match: m2 is unaffected by m1");
// block
await pg.query(`insert into match values ('m3','A','D')`); await W.shareConsent("m3", "A", ""); await W.shareConsent("m3", "D", "+44 20 7946 0958");
ok((await W.waLink("A", "m3")) !== null, "m3 mutual");
await pg.query(`insert into block values ('D','A')`);
ok((await W.waLink("A", "m3")) === null && (await W.shareConsent("m3", "D", "")) === "closed", "a block removes access to the number");
// wipe
await W.wipeWhatsApp("A");
ok((await pg.query(`select 1 from member_phone where "userId"='A'`)).rows.length === 0 && (await pg.query(`select 1 from whatsapp_consent where "userId"='A'`)).rows.length === 0, "delete-account wipe removes number and consents");
fs.unlinkSync(f);
// ---- static privacy checks over the source
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (["node_modules", ".next", ".git", "tests", "migrations"].includes(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), files = walk(root).filter((x) => /\.(js|jsx|mjs)$/.test(x));
const touch = files.filter((x) => /member_phone|whatsapp_consent|memberPhones|whatsappConsents/.test(fs.readFileSync(x, "utf8"))).map((x) => path.relative(root, x).replace(/\\/g, "/"));
ok(touch.every((x) => ["lib/whatsapp.js", "schema.js"].includes(x)), "privacy: only lib/whatsapp.js (and the schema file) reference the phone/consent tables. Found: " + touch.join(", "));
const ev = fs.readFileSync(path.join(root, "app/whatsappActions.js"), "utf8");
const calls = ev.match(/logCoffee\([^;]*;/g) || [];
ok(calls.length === 3 && calls.every((c) => /, \{\}\)/.test(c)), "privacy: every WhatsApp event is logged with empty metadata (no number, no content)");
ok(/whatsapp_connect_requested/.test(ev) && /whatsapp_connect_accepted/.test(ev) && /whatsapp_chat_opened/.test(fs.readFileSync(path.join(root, "app/api/whatsapp/[id]/route.js"), "utf8")), "events: requested, accepted and chat_opened are all tracked");
ok(!/wa\.me|phone/.test(fs.readFileSync(path.join(root, "app/WhatsAppConnect.jsx"), "utf8").replace(/name="phone"|"phone"|Your WhatsApp number|inputMode="tel"/g, "").replace(/\bphone number\b/g, "")), "privacy: the page component never contains a wa.me link or a number (button uses /api/whatsapp/[id])");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
