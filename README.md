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
data. Both start empty; there is no seed/demo content.

## Real infrastructure, no server

- **Database & auth**: [Supabase](https://supabase.com) (hosted Postgres + Auth), talked to
  directly from the browser via `@supabase/supabase-js`. There is no custom backend server —
  Row Level Security policies and custom RPC functions in Postgres keep data safe and enforce permissions.
- **Hosting**: static build deployed to **GitHub Pages** on every push to `main` (see
  `.github/workflows/deploy.yml`).
- **File & Asset Management**: integration with Google Drive via a Google Apps Script web app endpoint (`google-apps-script/upload.gs`), supporting direct uploads, staging folders, folder management, and native Google Docs / Slides / Sheets creation.

## Login

The manager dashboard is gated by a **5-digit PIN** (`src/features/auth/PinInput.tsx`).
Under the hood there are two fixed Supabase Auth accounts — one PIN each — with equal permissions.
This attributes posts, reviews, and comments to the right team member (e.g., "Dr. Wael Elmayyah" vs. "Mazen").

The public review page (`/share/:id`) **never** requires login. Clients and external reviewers can view the calendar and approve or request changes via dedicated RPC calls without needing an account.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase URL/key and upload script URL
npm run dev                        # http://localhost:5173
```

`.env.local` is never committed. Ask your project owner for the Supabase project credentials and Google Apps Script URL.

Optional local-only convenience: set `VITE_DEV_LOGIN_PIN` in `.env.local` to a valid PIN to sign in automatically during development.

### Local Development with SQL / Supabase CLI

You can develop either against a cloud Supabase project or locally with Docker using the Supabase CLI:

```bash
# Start local Supabase containers (Postgres, Auth, Storage, Studio)
npx supabase start

# Apply all migration scripts in sequence
npx supabase migration up

# Open local Supabase Studio UI
# http://localhost:54323
```

| Script                | What it does                                                     |
| --------------------- | ---------------------------------------------------------------- |
| `npm run dev`         | Vite dev server                                                  |
| `npm run build`       | Typecheck, then production build                                 |
| `npm run build:pages` | Production build with `/WonderLearn-CRM/` base path (used by CI) |
| `npm run preview`     | Serve the production build                                       |
| `npm test`            | Vitest unit and component tests                                  |
| `npm run test:e2e`    | Playwright end-to-end tests                                      |
| `npm run lint`        | ESLint                                                           |
| `npm run format`      | Prettier                                                         |

## Key Features & Architecture

### 1. Calendar & Drag-and-Drop Rescheduling

- **FullCalendar Integration** (`@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`):
  - Month grid view optimized for rapid scanning with status indicators and platform badges.
  - Week time grid view with precise slot scheduling.
  - Interactive **drag-and-drop** allows moving posts across days or time slots with instant optimistic updates, visual drop highlights, and automatic error rollbacks.

### 2. Review Workflow & Drive Staging

- Posts progress through four distinct stages: `review` → `changes_required` → `waiting_to_post` → `posted`.
- Post artwork automatically lands in a dedicated **Review** Drive folder on upload.
- Approving a post automatically triggers `moveToStage` to transfer the asset to the **Done** folder in Google Drive.
- Anonymous clients leave feedback and mark approval through the secure `add_feedback` Postgres RPC function.

### 3. File & Cloud Asset Management (`/files`)

- Built-in visual folder browser for project assets.
- Create nested Drive folders and create native Google Docs, Sheets, or Slides directly from the dashboard.
- Upload media files up to 20MB with progress and preview indicators.

### 4. Team Roster Management (`/team`)

- Manage team members, roles, email contacts, and social platform specialties per workspace.
- Seamlessly renames assignees across existing posts upon roster updates.

### 5. Database Schema & Migrations

- Migration files live in `supabase/migrations/`:
  - `0001_init.sql`: Base tables (`posts`, `feedback`, `shares`, `team_members`) and RLS policies.
  - `0002_file_management.sql`: Folder and file metadata tables (`folders`, `files`).
  - `0003_review_workflow.sql`: Review workflow columns, stage tracking, and `add_feedback` RPC function.

## Tech Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Radix UI · Redux Toolkit · TanStack Query ·
Supabase (Postgres + Auth + RPC) · React Hook Form + Zod · FullCalendar · Framer Motion · GSAP ·
Recharts · Sonner · i18next (EN/AR + RTL) · Vitest · Playwright
