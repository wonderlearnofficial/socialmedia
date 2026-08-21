# Wonderlearn — content calendar & review platform

React + TypeScript + Vite SPA, deployed as a static site to GitHub Pages
(`wonderlearnofficial/socialmedia`), backed by a real Supabase Postgres
database with Supabase Auth. Two workspaces — "Wonderlearn" and "Dr. Wael"
(LinkedIn-only) — let a social media manager plan a content calendar and let
a client review/approve posts with no account needed.

## Hard constraints — do not violate these

- **No server of my own, ever.** GitHub Pages (static hosting) is the only
  infrastructure the client operates. Supabase (hosted Postgres + Auth) and
  a Google Apps Script web app (file uploads) are the only backends, and
  both are called directly from the browser — nothing runs on infra I'd
  need to deploy or maintain.
- **No admin/user privilege split, anywhere.** There are two login accounts
  purely so actions/comments attribute to the correct real name (Dr. Wael
  Elmayyah vs. Mazen) — both have fully identical capabilities. Never
  reintroduce an "admin-only" gate on any feature.
- **The public review page (`/share/:id`) must never require login.** That's
  the entire point of it — a client opens a link and reviews/approves posts
  with no account. `SharedCalendarPage.tsx` intentionally does not route
  through `RequireAuth` and fetches with its own locally-scoped query (not
  `usePostsQuery`, which reads the _viewer's_ `activeWorkspace` setting and
  would show the wrong workspace's data to a fresh visitor).
- **Never commit real credentials.** `.env.local` (Supabase URL/key, upload
  script URL, dev-only login PIN) is gitignored and must stay that way.
  E2E tests that need to sign in read `E2E_LOGIN_PIN` from the environment
  and skip gracefully if it's unset — never hardcode a real PIN into a
  committed spec file.
- **Never request or use the Supabase service role key.** RLS policies are
  the actual security boundary; the anon/publishable key is meant to be
  public. Schema changes need the database password instead (Project
  Settings → Database — scoped to just this project's Postgres, unlike a
  service role key or personal access token).

## Architecture

- **Auth**: two fixed Supabase Auth accounts (`ADMIN_EMAIL/USER_EMAIL` in
  `src/lib/constants.ts`, never shown in the UI) gate the manager dashboard
  via `RequireAuth.tsx`. The real credential is a 5-digit PIN
  (`src/features/auth/PinInput.tsx`), padded with a fixed prefix
  (`pinToPassword` in `src/lib/signIn.ts`'s companion constants) purely to
  satisfy Supabase's password-length minimum — not extra secrecy. Sign-in
  tries both accounts in sequence (`src/lib/signIn.ts`) since there's no
  admin/user distinction to route on.
  - **Local dev convenience**: set `VITE_DEV_LOGIN_PIN` in `.env.local` to
    skip the PIN screen on every `npm run dev` reload (see
    `src/hooks/useSession.ts`). Gated by `import.meta.env.DEV`, so it's
    dead-code-eliminated from production builds — never set this var in a
    deployed environment. `playwright.config.ts`'s `webServer.env`
    explicitly clears it so e2e tests still see the real login gate.
- **Data layer**: `src/services/api.ts` is the one seam every hook calls
  through (`listPosts`, `createPost`, `addFeedback`, etc.) — talks to
  Supabase via `@supabase/supabase-js` (PostgREST), no snake_case↔camelCase
  mapping needed since Postgres columns use quoted mixed-case names.
  `src/hooks/usePosts.ts`'s `usePostsQuery()` scopes by workspace _inside
  the query key_ (`['posts', workspace]`) — scoping happens once upstream,
  not as a per-page filter, so every consumer inherits it for free.
- **RLS model** (`supabase/migrations/`): public `SELECT` on every content
  table (required for the no-login review page); `authenticated`-only
  writes for everything except `add_feedback()`, a `SECURITY DEFINER` RPC
  that lets an anonymous client owner approve/request-changes without
  being able to write anything else.
- **File uploads**: `src/services/upload.ts` posts base64 file data straight
  to a Google Apps Script web app (`VITE_UPLOAD_SCRIPT_URL`), which drops
  files into one shared Drive folder and returns a shareable link — no file
  ever touches this app's own infra. Body is sent without an explicit
  `Content-Type` header on purpose: Apps Script can't handle CORS
  preflight, and `text/plain` (fetch's default) keeps it a "simple
  request". Client-side 20MB/file cap, since Apps Script's `doPost` payload
  ceiling is ~50MB and base64 inflates size ~37%.
- **i18n**: `src/locales/{en,ar}.json`, RTL handled via `dir` on `<html>`.
  Keep both files' keys in sync when adding UI strings.

## Commands

```
npm run dev          # local dev server
npm run typecheck     # tsc --noEmit
npm run lint          # eslint .
npm test              # vitest run
npm run test:e2e       # playwright test (needs E2E_LOGIN_PIN env var for the authenticated flow; other tests run without it)
npm run build:pages   # production build with the /socialmedia/ base path (what CI runs)
```

CI (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on
every push to `main` — lint, typecheck, and unit tests all gate the deploy.
Repo secrets required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_UPLOAD_SCRIPT_URL`.

## Layout

- `src/app/` — routes/pages, `RequireAuth`
- `src/features/` — one folder per domain (`posts`, `calendar`, `review`,
  `sharing`, `team`, `analytics`, `auth`, `media`, `settings`)
- `src/hooks/` — TanStack Query hooks wrapping `services/api.ts`
- `src/services/` — `supabaseClient.ts`, `api.ts`, `upload.ts`
- `src/store/` — Redux Toolkit (currently just UI/session-local settings —
  `activeWorkspace`, theme, language — never data that lives in Postgres)
- `supabase/migrations/` — run manually in the Supabase SQL Editor (or via
  the database password + `pg`/`psql`) — nothing here runs automatically
