import type { ReactNode } from 'react'
import { useSession } from '@/hooks/useSession'
import { LoginPage } from './pages/LoginPage'
import { RouteFallback } from './RouteFallback'

/** Gates the manager dashboard. The public /share/:id route never passes through here. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated } = useSession()
  if (loading) return <RouteFallback />
  if (!isAuthenticated) return <LoginPage />
  return children
}
