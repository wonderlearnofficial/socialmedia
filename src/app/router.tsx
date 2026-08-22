import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { CalendarPage } from './pages/CalendarPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RequireAuth } from './RequireAuth'
import { RouteFallback } from './RouteFallback'

// The calendar is the primary destination and ships in the main bundle;
// everything else is split out so it never delays first paint.
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })))
const PostsPage = lazy(() => import('./pages/PostsPage').then((m) => ({ default: m.PostsPage })))
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
)
const TeamPage = lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })))
const FilesPage = lazy(() => import('./pages/FilesPage').then((m) => ({ default: m.FilesPage })))
const TimeTrackerPage = lazy(() =>
  import('./pages/TimeTrackerPage').then((m) => ({ default: m.TimeTrackerPage })),
)
const TimeReportsPage = lazy(() =>
  import('./pages/TimeReportsPage').then((m) => ({ default: m.TimeReportsPage })),
)
// Full-spec prototype (requirements CSV) — delete once decisions land.
const TimeTrackerSpec = lazy(() =>
  import('@/features/time/TimeTrackerSpec').then((m) => ({ default: m.TimeTrackerSpec })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const AuthorityMatrixPage = lazy(() =>
  import('./pages/AuthorityMatrixPage').then((m) => ({ default: m.AuthorityMatrixPage })),
)
const SharedCalendarPage = lazy(() =>
  import('./pages/SharedCalendarPage').then((m) => ({ default: m.SharedCalendarPage })),
)

const withSuspense = (node: ReactNode) => <Suspense fallback={<RouteFallback />}>{node}</Suspense>

// Vite injects the deploy base (e.g. "/socialmedia/" on GitHub Pages).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      ),
      children: [
        { index: true, element: <CalendarPage /> },
        { path: 'home', element: withSuspense(<HomePage />) },
        { path: 'social-media', element: <CalendarPage /> },
        { path: 'dr-wael', element: <CalendarPage workspace="dr_wael" /> },
        { path: 'posts', element: withSuspense(<PostsPage />) },
        { path: 'analytics', element: withSuspense(<AnalyticsPage />) },
        { path: 'team', element: withSuspense(<TeamPage />) },
        { path: 'files', element: withSuspense(<FilesPage />) },
        { path: 'time', element: withSuspense(<TimeTrackerPage />) },
        { path: 'time/redesign', element: withSuspense(<TimeTrackerSpec />) },
        { path: 'time-reports', element: withSuspense(<TimeReportsPage />) },
        { path: 'authority-matrix', element: withSuspense(<AuthorityMatrixPage />) },
        { path: 'settings', element: withSuspense(<SettingsPage />) },
        { path: 'profile', element: withSuspense(<ProfilePage />) },
      ],
    },
    // Review mode lives outside the dashboard shell on purpose.
    { path: '/share/:shareId', element: withSuspense(<SharedCalendarPage />) },
    { path: '*', element: <NotFoundPage /> },
  ],
  { basename },
)
