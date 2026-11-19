// Run: npm i --no-save @electric-sql/pglite && node tests/migrate.test.mjs
import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import { split } from "../scripts/migrate.mjs";
let pass = 0, fail = 0; const ok = (c, m) => { (c ? pass++ : fail++); console.log((c ? "PASS " : "FAIL ") + m); };
const rd = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
const a = split("create table t (a text); -- note; with semicolon\ninsert into t values ('x;y''z');\ndo $$ begin raise notice 'a;b'; end $$;\n");
ok(a.length === 3 && a[1].includes("'x;y''z'") && a[2].startsWith("do $$") && a[2].endsWith("$$"), "splitter keeps strings, comments and $$ blocks intact");
const s19 = split(rd("migrations/kave19-coffee-flow.sql")), s18 = split(rd("migrations/kave18-unique-match.sql"));
ok(s19.length === 3 && s18.length === 1, "splitter: kave19 has 3 statements, kave18 DO block stays one");
const pg = new PGlite(); await pg.exec(`create table match (id text, a text, b text);`);
for (let r = 0; r < 2; r++) { for (const s of [...s18, ...s19]) await pg.query(s); }
ok((await pg.query(`select count(*)::int n from information_schema.tables where table_name in ('coffee_confirmation','coffee_feedback')`)).rows[0].n === 2, "statements run one by one, twice, without error (idempotent)");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
