import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { BarChart3, CalendarDays, FolderOpen, LayoutList, Settings, Users } from 'lucide-react'
import { BrandLockup } from '@/components/shared/Brand'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'

const NAV = [
  { to: '/', key: 'nav.socialMedia', icon: CalendarDays, end: true },
  { to: '/dr-wael', key: 'nav.drWael', icon: CalendarDays, end: true },
  { to: '/posts', key: 'nav.posts', icon: LayoutList },
  { to: '/analytics', key: 'nav.analytics', icon: BarChart3 },
  { to: '/team', key: 'nav.team', icon: Users },
  { to: '/files', key: 'nav.files', icon: FolderOpen },
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
  const { displayName } = useSession()

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-e lg:flex">
      <div className="flex h-16 items-center border-b px-4">
        <BrandLockup fluid />
      </div>
      <SidebarNav />
      <div className="mt-auto border-t p-3">
        <p className="truncate text-xs font-semibold text-foreground">
          {displayName || t('common.manager')}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t('common.manager')}</p>
      </div>
    </aside>
  )
}
