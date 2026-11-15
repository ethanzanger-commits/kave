# kave
Coffee with people outside your network. Private beta, Jerusalem first.

## Run locally (Windows)
`powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1`, fill `.env.local`, `npm run db:push`, `npm run dev`.

## Put it on GitHub
`powershell -ExecutionPolicy Bypass -File .\scripts\publish.ps1` (`.env.local` is git-ignored, so keys stay private).

## Launch the beta
1. Import the repo into Vercel and add every variable from `.env.example` (set `APP_URL` to your Vercel URL).
2. Add the production callback URLs to LinkedIn and Google: `https://YOUR-URL/api/auth/callback/linkedin` and `/google`.
3. Sign in once, set `ADMIN_EMAIL` to your email, open `/admin`, load demo people.
4. Share your invite link from My coffees. Everyone gets 3 free coffee requests, then `UNLOCK_INVITES` invited friends unlock the rest.

<!-- build-trigger 11/12/2026 10:31:59 -->

<!-- re-verify auth env -->
