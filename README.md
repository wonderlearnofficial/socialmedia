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

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script             | What it does                     |
| ------------------ | -------------------------------- |
| `npm run dev`      | Vite dev server                  |
| `npm run build`    | Typecheck, then production build |
| `npm run preview`  | Serve the production build       |
| `npm test`         | Vitest unit + component tests    |
| `npm run test:e2e` | Playwright end-to-end tests      |
| `npm run lint`     | ESLint                           |
| `npm run format`   | Prettier                         |

## The demo

The app seeds **39 posts across August 2026** for Wonderlearn, built around a Back to
School campaign. **August 21** is the scenario day and shows the whole review loop at once:

| Platform  | Post                         | Status            |
| --------- | ---------------------------- | ----------------- |
| Instagram | Back to School Campaign      | In Review         |
| Facebook  | Back to School Campaign      | Approved          |
| X         | Live Webinar Teaser          | Scheduled         |
| TikTok    | Behind The Scenes            | Changes Requested |
| YouTube   | Product Video — Class Quests | In Review         |

Open the TikTok post to see the owner's feedback: _"Please use the second version of the
video."_

To see the owner's side, click **Share Calendar → Open preview**. The share link opens
**review mode**: same calendar, no sidebar, no editing — just approve and request changes.

Settings → _Reset demo data_ restores the seed at any time.

## How it works

Data lives in the browser. `src/services/mockServer.ts` is a small in-memory API mounted as
a custom **axios adapter** and persisted to `localStorage`, so approvals and feedback
survive a reload. Every component talks to it through `src/services/api.ts` and TanStack
Query — to go live, point `http` at a real backend and drop the adapter. No other code changes.

Because the data is per-browser, a share link only shows content in the browser that
created it.

### State

- **Redux Toolkit** — UI state: filters, calendar view, which modal is open, settings.
- **TanStack Query** — server state: posts, share links, mutations.

Keeping them separate means filtering the calendar never refetches, and approving a post
updates every view at once.

### Architecture

```
src/
├── app/             # providers, router, pages, error boundary, theme sync
├── components/
│   ├── ui/          # shadcn-style primitives on Radix
│   ├── layout/      # app shell, sidebar, page header
│   └── shared/      # PlatformIcon, StatusBadge, Brand, EmptyState
├── features/
│   ├── calendar/    # grid, day modal, list, mobile agenda, filters, search
│   ├── posts/       # details drawer, editor, platform selector, social preview
│   ├── review/      # review thread, feedback form
│   ├── sharing/     # share modal
│   ├── media/       # provider detection, previews, thumbnails
│   ├── analytics/   # (charts live in app/pages/AnalyticsPage)
│   └── team/
├── store/slices/    # filters, view, settings
├── services/        # axios, mock server, API, query client
├── hooks/  lib/  types/  locales/
```

### Platform icons

`<PlatformIcon platform="instagram" />` is the only place platform artwork exists —
official brand paths, sized with `className`, optionally painted in brand colors with
`brand`. TikTok and X get a light variant so their black marks stay visible on dark.

### Dragging

Rescheduling a post is a calendar interaction, so it uses **FullCalendar's own** drag
system (`@fullcalendar/interaction`) — drop a post on another day and it re-times and
saves, with a toast confirming the new date. `dnd-kit` is installed for custom drag
interactions outside the calendar; nothing in the current surface area needs one, so it is
not yet exercised.

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
- **Playwright** — the full workflow: calendar → day → post → review, sharing into review
  mode, requesting changes, search and filters, creating a post, and drag-to-reschedule.

```bash
npm test
npm run test:e2e
```

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Radix UI · Redux Toolkit · TanStack Query ·
axios · React Hook Form + Zod · FullCalendar · Framer Motion · GSAP · Recharts · Sonner ·
i18next · Vitest · Playwright
