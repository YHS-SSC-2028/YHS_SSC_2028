
# YHS SSC Batch 2028 — GitHub Pages setup

This package contains the school website, private-on-device study goals, a Snake game, and the client code for a shared 72-hour leaderboard.

## What is free, and what is stored?

- **GitHub Pages:** free static hosting for a public repository on GitHub Free.
- **Kinde:** keeps the existing sign-in. The browser client ID is public by design; never add a Kinde client secret to this website.
- **Study goals:** stored in each student's browser only. They are private to that browser profile and do not sync to another phone.
- **Snake game:** runs in the browser. The device's best score is local.
- **Shared ranking:** Supabase stores at most one row per Kinde user. A new 72-hour season replaces that user's previous row the next time they submit a score. The table does not grow by adding one row every game.

The leaderboard is a casual client-played competition, not an anti-cheat esports system. A determined user can tamper with browser code or submit a fabricated score. The server validates Kinde identity and score range, but cannot prove that every point was earned through legitimate gameplay.

## Part A — Publish the site on GitHub Pages

1. Sign in at <https://github.com>.
2. Tap **+** → **New repository**.
3. Name it `YHS_SSC_2028`.
4. Choose **Public** (GitHub Free requires a public repository for Pages).
5. Create the repository.
6. Open the repository and choose **Add file → Upload files**.
7. Extract this ZIP first, then upload `index.html`, `school-logo.webp`, `school-campus.webp`, `.nojekyll`, and the other package files/folders. Do not upload the ZIP as the only file.
8. Commit the uploaded files to the `main` branch.
9. Open **Settings → Pages**.
10. Under **Build and deployment**, choose **Deploy from a branch**.
11. Select branch `main` and folder `/ (root)`, then **Save**.
12. Wait for the deployment to finish. Your address will look like:
    `https://YOUR-GITHUB-USERNAME.github.io/YHS_SSC_2028/`

GitHub Pages can take several minutes to publish the first time.

Official guide: <https://docs.github.com/en/pages/quickstart>

## Part B — Update Kinde for the GitHub Pages address

1. Open your Kinde dashboard: <https://app.kinde.com/>.
2. Open the application used by this website.
3. In **Allowed callback URLs**, add the exact GitHub Pages URL, including the final slash:
   `https://YOUR-GITHUB-USERNAME.github.io/YHS_SSC_2028/`
4. In **Allowed logout redirect URLs**, add the same exact URL.
5. Save the settings.
6. Test Sign in and Sign out from the deployed GitHub Pages website.

The app uses the full current page URL as its callback, so the repository path is retained.

## Part C — Create the free Supabase project

1. Open <https://supabase.com/> and sign in.
2. Create a new organization if prompted, then create a project.
3. Choose the **Free** plan.
4. Set a strong database password and save it somewhere private. Do not put it in website files.
5. Wait for the database to finish provisioning.
6. Open **Project Settings → API** (or **Connect**, depending on the dashboard layout).
7. Copy the **Project URL** and the public **anon/publishable key**. These are the two browser values needed by the website.
8. Do **not** copy the `service_role` / secret key into `index.html`, GitHub, or any public file.

## Part D — Create the small leaderboard table

1. In Supabase, open **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this package.
3. Copy all its SQL into the SQL Editor and run it.
4. The table is configured for public read-only leaderboard access. Students cannot insert, update, or delete scores directly from the browser.
5. The Edge Function writes one row per Kinde user using the private service-role key stored only on Supabase's server.

## Part E — Create a Kinde API audience for score submissions

The Edge Function verifies the Kinde access token. It expects the audience `yhs-snake`.

1. In Kinde, open **Settings → APIs** and add an API.
2. Use `yhs-snake` as its audience/identifier.
3. Save the API.
4. Open your website's Kinde application and authorize it to use the `yhs-snake` API.
5. The app already requests this audience in its Kinde SDK initialization.
6. Make sure the API access token is issued with the expected audience. If your Kinde environment uses a different audience value, change `KINDE_AUDIENCE` in `index.html` and `KIND_AUDIENCE` in the Edge Function so they match exactly.

## Part F — Deploy the score-submission Edge Function

The function is included at `supabase/functions/submit-snake-score/index.ts`.

You need the Supabase CLI for deployment. On a computer with Node.js installed:

1. Install the Supabase CLI using the official instructions: <https://supabase.com/docs/guides/cli>.
2. In a terminal, enter the extracted website folder.
3. Log in:
   `supabase login`
4. Link this folder to your project (replace the reference with your project's reference ID):
   `supabase link --project-ref YOUR_PROJECT_REF`
5. Deploy the function without Supabase's default JWT check, because the function verifies Kinde's JWT itself:
   `supabase functions deploy submit-snake-score --no-verify-jwt`
6. The function uses the project's server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables. Never copy the service-role key into the website.

If you cannot use a computer, you can use a terminal app that supports Node.js and the Supabase CLI, but the official CLI setup is usually easier on a desktop.

## Part G — Add your Supabase public settings to the website

1. Open `index.html` in GitHub's editor.
2. Find these two lines near the top of the Kinde module:
   ```js
   const SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co";
   const SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY";
   ```
3. Replace them with your real Supabase **Project URL** and **anon/publishable key**.
4. Do not use a `service_role` or secret key here.
5. Commit the change to `main`. GitHub Pages will redeploy automatically.
6. Open the deployed site, sign in with Kinde, play Snake, and finish a game. Your score should be submitted to the online ranking.
7. Use **Refresh ranking** to fetch the current top 10.

## Part H — Storage and usage target

This setup is deliberately small:

- No profile-photo uploads.
- No chat messages or uploaded media.
- No per-game score history.
- One leaderboard row per student, overwritten for each new season.
- Study goals stay on the student's device.
- Leaderboard is loaded on page open or when a student taps Refresh; it does not maintain a live connection or poll continuously.

For 1,000 students, a single compact row per user should use far less than 100 MB. The total Supabase project usage still depends on logs, indexes, backups and other services, so monitor the Supabase usage page. Free-tier quotas and policies can change; check the current plan before launch.

## Troubleshooting

- **Kinde returns an error:** check that the callback and logout URLs match the deployed GitHub Pages URL exactly.
- **The page is blank or images are missing:** check that `index.html`, `school-logo.webp` and `school-campus.webp` are all in the repository root.
- **Leaderboard says not configured:** replace both Supabase placeholders in `index.html`, deploy the SQL schema, and deploy the Edge Function.
- **Score submission says unauthorized:** check that the Kinde application is authorized for the `yhs-snake` API and that the Edge Function audience matches.
- **Goals disappeared:** browser local storage may have been cleared, or you may be using a different browser/device. Goals are not cloud-synced.

## Important security rules

- The Supabase anon/publishable key is designed to be used in public frontend code; database access is restricted by Row Level Security.
- Never publish the Supabase service-role key, database password, Kinde client secret, or any other private server secret.
- Do not disable Row Level Security on the leaderboard table.


## Already configured in November 2026

The Supabase project has already been created for this site. Its project URL and browser-safe publishable key are filled into `index.html`. The `snake_scores` table, row-level security read policy, and `submit_snake_score` database function have been created. The `submit-snake-score` Edge Function has also been deployed. Do not add a service-role key to this website.

Remaining external setup: create a GitHub repository and upload these files to its default branch, then enable GitHub Pages. In the Kinde dashboard, ensure the API audience `yhs-snake` is configured and that the deployed GitHub Pages URL is listed as an allowed callback and logout URL.
