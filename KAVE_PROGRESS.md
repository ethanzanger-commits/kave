# Kave progress
## State
Live with email sign-in. Built and build-verified (not browser-tested): referrals + share card, Founding 50, milestone counter, availability, coffee requests, profile reminders, city presets, admin /admin/growth + /admin/analytics, cheat sheets, map, messages, intros. DB tests: 19/19 pass (pglite).
## Goal
50 completed profiles by end of week (about 15 signups before launch posts; LinkedIn + WhatsApp posts done).
## Owner must confirm
Neon migrations run in order: base tables, later feature SQL, `kave2.sql`, `kave3-cities.sql`. Demo users removed before real launch.
## Done this session
Welcome page + welcome email on first completion, sticky Save bar, account-status line, onboarding drop-off + incomplete sign-up list in /admin/growth, Founding spots on home, home OG image, robots, `migrations/kave4-indexes.sql`.
Also: Who's new (7 days via profile.completedAt), monthly leaderboards (/leaderboard), winner flair + search priority next month (monthly_winner, finalized lazily in lib/leaders.js), `migrations/kave5-leaderboards.sql`, `tests/leaders.test.mjs`.
Also: /contact (Formspree via NEXT_PUBLIC_FORMSPREE_ID), branded HTML emails for all mail, custom magic-link email, optional SMTP_* sender (Brevo) via lib/mail.js.
## Next steps
1. Attribute referrals at sign-up (not only at profile completion).
2. LinkedIn sign-in (removes email wait).
3. Industry filter on Who's around; circles; push notifications.
4. Visit-level funnel (Vercel Analytics) vs registrations.
## Known limits
Gmail ~500/day; Vercel Hobby daily cron (GitHub Action hourly optional); no email-open tracking; photos stored in DB; Discover ranks up to 300 profiles in app code; legal text needs lawyer review; rotate any secret pasted in chat.
