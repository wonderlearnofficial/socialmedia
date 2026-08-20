import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { BarChart3, CalendarDays, LayoutList, Settings, Users } from 'lucide-react'
import { BrandLockup } from '@/components/shared/Brand'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/store/hooks'

const NAV = [
  { to: '/', key: 'nav.calendar', icon: CalendarDays, end: true },
  { to: '/posts', key: 'nav.posts', icon: LayoutList },
  { to: '/analytics', key: 'nav.analytics', icon: BarChart3 },
  { to: '/team', key: 'nav.team', icon: Users },
  { to: '/settings', key: 'nav.settings', icon: Settings },
] as const

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            {t(item.key)}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  const { t } = useTranslation()
  const workspaceName = useAppSelector((s) => s.settings.workspaceName)

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-e bg-card/40 lg:flex">
      <div className="flex h-14 items-center border-b px-4">
        <BrandLockup subtitle={t('app.tagline')} size="sm" />
      </div>
      <SidebarNav />
      <div className="mt-auto p-3">
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-[11px] font-medium">{workspaceName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t('common.manager')}</p>
        </div>
      </div>
    </aside>
  )
}
