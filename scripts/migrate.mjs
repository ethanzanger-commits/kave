// Kave migration runner. Use it through scripts/migrate.ps1.
// Runs migrations/kaveN-*.sql in number order, once each, and records what ran in table _migration_log.
// Migrations are idempotent, so a re-run is harmless. It never deletes data by itself.
import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
const args = process.argv.slice(2), has = (f) => args.includes(f), val = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const dir = path.join(process.cwd(), "migrations");
// Splits a SQL file into single statements. Understands -- comments, 'strings' and $$ / $tag$ blocks (so DO blocks stay in one piece).
export function split(sql) {
  const out = []; let cur = "", i = 0, tag = null;
  while (i < sql.length) {
    const ch = sql[i], two = sql.slice(i, i + 2);
    if (tag) { if (sql.startsWith(tag, i)) { cur += tag; i += tag.length; tag = null; } else cur += sql[i++]; continue; }
    if (two === "--") { const e = sql.indexOf("\n", i); const end = e < 0 ? sql.length : e; cur += sql.slice(i, end); i = end; continue; }
    if (ch === "'") { let j = i + 1; while (j < sql.length) { if (sql[j] === "'" && sql[j + 1] === "'") j += 2; else if (sql[j] === "'") break; else j++; } cur += sql.slice(i, j + 1); i = j + 1; continue; }
    const d = ch === "$" ? sql.slice(i).match(/^\$[A-Za-z_]*\$/) : null;
    if (d) { tag = d[0]; cur += tag; i += tag.length; continue; }
    if (ch === ";") { if (cur.replace(/--[^\n]*/g, "").trim()) out.push(cur.trim()); cur = ""; i++; continue; }
    cur += ch; i++;
  }
  if (cur.replace(/--[^\n]*/g, "").trim()) out.push(cur.trim());
  return out;
}
const files = () => fs.readdirSync(dir).filter((f) => /^kave\d+.*\.sql$/.test(f)).sort((a, b) => parseInt(a.match(/kave(\d+)/)[1]) - parseInt(b.match(/kave(\d+)/)[1]));
if (process.argv[1] && process.argv[1].endsWith("migrate.mjs")) {
  const url = (process.env.DATABASE_URL || "").trim().replace(/^psql\s+/, "").replace(/^['"]|['"]$/g, "");
  if (!/^postgres(ql)?:\/\//.test(url)) { console.error("DATABASE_URL is missing or is not a postgresql:// address."); process.exit(1); }
  const sql = neon(url), run = (s) => sql.query(s);
  await run(`create table if not exists _migration_log (name text primary key, applied_at timestamptz default now())`);
  const done = new Set((await run(`select name from _migration_log`)).map((r) => r.name));
  const all = files();
  if (has("--list")) { for (const f of all) console.log((done.has(f) ? "applied  " : "PENDING  ") + f); process.exit(0); }
  if (has("--baseline")) { const upto = parseInt(val("--baseline"), 10); for (const f of all) if (parseInt(f.match(/kave(\d+)/)[1], 10) <= upto) await run(`insert into _migration_log (name) values ('${f}') on conflict do nothing`); console.log(`Marked kave2 to kave${upto} as already applied (nothing was run).`); process.exit(0); }
  if (!done.size && !val("--only")) { console.error("This database has no migration history yet.\nIf your earlier migrations (up to kave18) are already applied, run:  .\\scripts\\migrate.ps1 -Baseline 18\nThen run .\\scripts\\migrate.ps1 again to apply what is new."); process.exit(2); }
  const todo = val("--only") ? all.filter((f) => f.startsWith(val("--only"))) : all.filter((f) => !done.has(f) || has("--force"));
  if (!todo.length) { console.log(val("--only") ? "No migration file matches that name." : "Database is up to date. Nothing to run."); process.exit(val("--only") ? 1 : 0); }
  for (const f of todo) {
    const stmts = split(fs.readFileSync(path.join(dir, f), "utf8"));
    if (has("--dry")) { console.log(`[dry run] ${f}: ${stmts.length} statements`); continue; }
    process.stdout.write(`Running ${f} (${stmts.length} statements) ... `);
    try { for (const s of stmts) await run(s); await run(`insert into _migration_log (name) values ('${f}') on conflict do nothing`); console.log("done"); }
    catch (e) { console.log("FAILED"); console.error(String(e.message || e)); console.error("Stopped. Nothing after this file was run. Fix the cause, then run the script again."); process.exit(1); }
  }
  console.log(has("--dry") ? "Dry run finished. Nothing changed." : "All done.");
}
