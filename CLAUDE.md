# Kave (CLAUDE.md)
Coffee-matching for professionals across Israel. Live: kave-seven.vercel.app. Solo non-dev owner on Windows PowerShell; free tiers only.

## Stack
Next.js 15 App Router (plain JS) · Auth.js v5 (JWT sessions, Drizzle adapter, email magic link via Gmail/nodemailer; LinkedIn/Google buttons appear only if AUTH_* keys exist) · Neon Postgres: `db` (drizzle) and `client` (raw tagged SQL) from `db.js` · Vercel · OSM (Nominatim, Overpass, Leaflet) · Google Maps links only (no API key).

## Layout
`app/actions.js` all server actions · `lib/` helpers (match, gate, rewards, founding, community, complete, cities, avail, mail, track, cheat) · `app/api/cron/*` jobs (Bearer CRON_SECRET) · `migrations/*.sql` · `public/badges/*.svg` · `tests/db.test.mjs`.

## Conventions
- Schema changes: add to `schema.js` AND a SQL file in `migrations/`; owner runs it in Neon SQL Editor (drizzle-kit push is unreliable). Keep migrations idempotent.
- Profile complete = `missing(profile, user.image)` in `lib/complete.js` (photo, city, headline, about, 1+ skill, 18+). Server re-checks in `saveProfile`.
- Location is city-only from `lib/cities.js` presets; `neighborhood` is stored equal to `city`. Never store coordinates.
- Founding 50: `lib/founding.js` (unique index + CHECK 1..50, retry). Referral credit set once at first `saveProfile` (`invitedBy`), never on update; no self-referral.
- Demo users have ids `demo-*`; exclude from all stats. Never delete production records except user-initiated `deleteAccount`.
- Emails: `sendMail` returns true/false. Marketing emails honor `optout` table and signed `/unsubscribe` link.
- Analytics: `track(userId, name)` into `event` (never throws).
- UI: tokens in `app/globals.css` (cream/aubergine/pink, Fraunces + DM Sans), mobile-first, shared `<Nav />`.

## Commands
Build check: `DATABASE_URL=postgres://u:p@localhost/db AUTH_SECRET=x npx next build`
DB logic tests: `npm i --no-save @electric-sql/pglite && node tests/db.test.mjs`
Deploy: `npx vercel --prod` (project folder `kave-full-new\kave`; GitHub push is out of sync, do not push from old folder).

## Env (Vercel Production)
DATABASE_URL, AUTH_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD, ADMIN_EMAIL, CRON_SECRET, UNLOCK_INVITES. Optional: APP_URL, MILESTONES, ANTHROPIC_API_KEY, AUTH_LINKEDIN_*, AUTH_GOOGLE_*.

## Security
Admin pages gate on `ADMIN_EMAIL`. Public share pages expose first name + headline + founding number only. 18+ required. Free plans only; no Supabase.
