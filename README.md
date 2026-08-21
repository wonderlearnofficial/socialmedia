# Wonderlearn — Content Calendar & Review Platform

A visual social media planning and approval platform. A social media manager plans a
month of content on a calendar, shares a link, and the business owner reviews each post
and either approves it or requests changes.

```
MONTHLY CALENDAR → CLICK DAY → SEE ALL POSTS → CLICK POST
      → SEE DETAILS + CONTENT → OWNER REVIEWS → APPROVE / REQUEST CHANGES
```

It is not a publishing tool. Nothing is posted to any social network — the product is the
plan, the conversation about it, and the approval.

## The two workspaces

The app has two independent content calendars, switched via a tab in the header:

| Workspace   | Platforms                                         |
| ----------- | ------------------------------------------------- |
| Wonderlearn | Instagram, Facebook, YouTube, TikTok, X, LinkedIn |
| Dr. Wael    | LinkedIn only                                     |

Each has its own posts, team roster, and review links — switching tabs never mixes their
data. Both start empty; there is no seed/demo content in production.

## Real infrastructure, no server

- **Database & auth**: [Supabase](https://supabase.com) (hosted Postgres + Auth), talked to
  directly from the browser via `@supabase/supabase-js`. There is no backend of ours —
  Row Level Security policies in Postgres are what actually keep data safe, not a server.
- **Hosting**: static build deployed to **GitHub Pages** on every push to `main` (see
  `.github/workflows/deploy.yml`). No server to operate, ever.
- **File uploads**: a small Google Apps Script web app (owned outside this repo) receives
  files from the browser and drops them into a Google Drive folder, returning a shareable
  link. See `src/services/upload.ts`.

## Login

The manager dashboard is gated by a **5-digit PIN** (`src/features/auth/PinInput.tsx`).
Under the hood there are two fixed Supabase Auth accounts — one PIN each — but there is
**no admin/user distinction**: both accounts can do exactly the same things. The only
reason there are two is so posts, comments, and status changes get attributed to the
right real name (e.g. "Dr. Wael Elmayyah" vs. "Mazen") instead of a generic "Manager".

The public review page (`/share/:id`) **never** requires login — that's the whole point
of it. Anyone with the link can open it, see the calendar, and approve or request
changes on a post.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in the Supabase URL/key and upload script URL
npm run dev                        # http://localhost:5173
```

`.env.local` is never committed. Ask whoever owns the Supabase project for the URL and
publishable (anon) key, and the Google Apps Script exec URL for uploads.

Optional local-only convenience: set `VITE_DEV_LOGIN_PIN` in `.env.local` to a real PIN
and `npm run dev` signs you in automatically — no need to retype the PIN on every reload.
It has no effect on production builds or on `npm run test:e2e` (which always exercises the
real login gate).

| Script                | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `npm run dev`         | Vite dev server                                                    |
| `npm run build`       | Typecheck, then production build                                   |
| `npm run build:pages` | Production build with the `/socialmedia/` base path (what CI runs) |
| `npm run preview`     | Serve the production build                                         |
| `npm test`            | Vitest unit + component tests                                      |
| `npm run test:e2e`    | Playwright end-to-end tests                                        |
| `npm run lint`        | ESLint                                                             |
| `npm run format`      | Prettier                                                           |

## How it works

`src/services/api.ts` is the single seam every hook calls through (`listPosts`,
`createPost`, `addFeedback`, …) — it talks to Supabase via PostgREST. Postgres columns use
quoted mixed-case names (`"contentType"`, `"createdAt"`) specifically so no
snake_case↔camelCase mapping layer is needed on either side.

Workspace scoping happens once, upstream, inside the query layer
(`src/hooks/usePosts.ts`'s query key is `['posts', workspace]`) rather than as a filter
applied per-page — every page that reads posts inherits the correct scoping for free.

### Database

Schema lives in `supabase/migrations/` as plain SQL, run manually in the Supabase SQL
Editor (nothing here runs automatically — there's no CI migration step). Tables:
`posts`, `feedback`, `shares`, `team_members`. Row Level Security: every table is publicly
**readable** (required for the no-login review page); every **write** requires a signed-in
session, except approving/requesting changes, which goes through a narrow
`add_feedback()` database function so an anonymous client owner can act without being
able to edit anything else.

### State

- **Redux Toolkit** — local UI state only: filters, calendar view, which modal is open,
  theme/language settings, which workspace tab is active. Never data that lives in
  Postgres.
- **TanStack Query** — server state: posts, feedback, shares, team members.

Keeping them separate means filtering the calendar never refetches, and approving a post
updates every view at once.

### Architecture

```
src/
├── app/             # providers, router, pages, RequireAuth, error boundary, theme sync
├── components/
│   ├── ui/          # shadcn-style primitives on Radix
│   ├── layout/      # app shell, sidebar, workspace switcher, page header
│   └── shared/      # PlatformIcon, StatusBadge, Brand, EmptyState
├── features/
│   ├── calendar/    # grid, day modal, list, mobile agenda, filters, search
│   ├── posts/       # details drawer, editor, platform selector, social preview, uploads
│   ├── review/      # review thread, feedback form
│   ├── sharing/     # share modal
│   ├── media/       # provider detection, previews, thumbnails
│   ├── auth/         # PIN input
│   ├── analytics/   # (charts live in app/pages/AnalyticsPage)
│   └── team/
├── store/slices/    # filters, view, settings
├── services/        # supabaseClient, api, upload, queryClient
├── hooks/  lib/  types/  locales/
```

### Platform icons

`<PlatformIcon platform="instagram" />` is the only place platform artwork exists —
official brand paths, sized with `className`, optionally painted in brand colors with
`brand`. TikTok and X get a light variant so their black marks stay visible on dark.

### File uploads

The post editor's **Upload files** / **Upload folder** buttons send files straight to a
Google Apps Script endpoint as base64, which stores them in Drive and returns a link —
filling in the post's content link automatically. Capped at 20MB per file (Apps Script's
request-size ceiling). Pasting an existing Drive/Dropbox/OneDrive/Figma/Canva link still
works exactly as before; uploading is just a shortcut for getting one.

### Dragging

Rescheduling a post is a calendar interaction, so it uses **FullCalendar's own** drag
system (`@fullcalendar/interaction`) — drop a post on another day and it re-times and
saves, with a toast confirming the new date.

### Media previews

`src/lib/media.ts` detects the provider from a URL — Google Drive, Dropbox, OneDrive,
Figma, Canva, or a direct image/video — and derives a thumbnail where one exists (Drive
file IDs become `drive.google.com/thumbnail?id=…`).

Remote media is always treated as untrusted: any image or video that fails to load
collapses into a labelled "Preview unavailable" card with the file name and a link to the
original. A broken asset never breaks the layout.

## Design

Dark by default, with light and system options; the theme is applied by an inline script
before first paint so there is no flash. English and Arabic with full RTL — the layout uses
logical properties (`ms-*`, `pe-*`, `start-*`) throughout, so mirroring is automatic.

Animation is deliberate: GSAP for page and month transitions, Framer Motion for the day
modal and drawer. Everything honours `prefers-reduced-motion`.

The month grid is the hero and is tuned for scanning — each post card carries platform,
title, time, and status as colour, never the caption.

## Testing

- **Vitest + Testing Library** — filtering, date and media logic; the day modal and
  `PlatformIcon` as components.
- **Playwright** — runs against a real dev server talking to the real Supabase project.
  Three tests need no credentials (login gate present, invalid PIN rejected, public share
  page never asks for login); the authenticated flow (create a post, confirm it appears,
  delete it) reads a PIN from `E2E_LOGIN_PIN` and skips if that's unset, rather than
  hardcoding a real credential into a committed file.

```bash
npm test
E2E_LOGIN_PIN=xxxxx npm run test:e2e
```

## Deployment

Every push to `main` runs lint, typecheck, and unit tests, then builds and deploys to
GitHub Pages via `.github/workflows/deploy.yml`. Required repo secrets (Settings → Secrets
and variables → Actions): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_UPLOAD_SCRIPT_URL`.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Radix UI · Redux Toolkit · TanStack Query ·
Supabase (Postgres + Auth) · React Hook Form + Zod · FullCalendar · Framer Motion · GSAP ·
Recharts · Sonner · i18next · Vitest · Playwright
