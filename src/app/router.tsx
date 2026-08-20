import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { CalendarPage } from './pages/CalendarPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteFallback } from './RouteFallback'

// The calendar is the primary destination and ships in the main bundle;
// everything else is split out so it never delays first paint.
const PostsPage = lazy(() => import('./pages/PostsPage').then((m) => ({ default: m.PostsPage })))
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
)
const TeamPage = lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })))
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
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
      element: <AppShell />,
      children: [
        { index: true, element: <CalendarPage /> },
        { path: 'posts', element: withSuspense(<PostsPage />) },
        { path: 'analytics', element: withSuspense(<AnalyticsPage />) },
        { path: 'team', element: withSuspense(<TeamPage />) },
        { path: 'settings', element: withSuspense(<SettingsPage />) },
      ],
    },
    // Review mode lives outside the dashboard shell on purpose.
    { path: '/share/:shareId', element: withSuspense(<SharedCalendarPage />) },
    { path: '*', element: <NotFoundPage /> },
  ],
  { basename },
)
