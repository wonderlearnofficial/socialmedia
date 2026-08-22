import { useTranslation } from 'react-i18next'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  BarChart3,
  CalendarDays,
  House,
  Clock,
  Folder,
  LayoutList,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { GlobalTimerIndicator } from '@/features/time/GlobalTimerIndicator'
import { BrandLockup, BrandMark } from '@/components/shared/Brand'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/hooks/useSession'
import { cn } from '@/lib/utils'
import { supabase } from '@/services/supabaseClient'

interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
}

interface NavSection {
  titleKey: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'sidebar.work',
    items: [
      { to: '/home', labelKey: 'nav.home', icon: House },
      { to: '/', labelKey: 'nav.socialMedia', icon: CalendarDays },
      { to: '/posts', labelKey: 'nav.posts', icon: LayoutList },
      { to: '/time', labelKey: 'nav.timeTracker', icon: Timer },
      { to: '/files', labelKey: 'nav.files', icon: Folder },
    ],
  },
  {
    titleKey: 'sidebar.management',
    items: [
      { to: '/team', labelKey: 'nav.team', icon: Users },
      { to: '/time-reports', labelKey: 'nav.timeReports', icon: Clock },
      { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
      { to: '/authority-matrix', labelKey: 'nav.authorityMatrix', icon: ShieldCheck },
    ],
  },
  {
    titleKey: 'sidebar.system',
    items: [{ to: '/settings', labelKey: 'nav.settings', icon: Settings }],
  },
]

interface SidebarNavProps {
  collapsed?: boolean
  onNavigate?: () => void
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { isSuperAdmin } = usePermissions()

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.to === '/authority-matrix') return isSuperAdmin
      return true
    }),
  })).filter((section) => section.items.length > 0)

  return (
    <TooltipProvider delayDuration={100}>
      <nav className={cn('flex flex-col gap-1 px-3 py-2', collapsed && 'items-center px-2 py-2')}>
        {visibleSections.map((section, sectionIdx) => (
          <div
            key={section.titleKey}
            className={cn(
              'flex w-full flex-col gap-0.5',
              sectionIdx > 0 && (collapsed ? 'mt-2.5' : 'mt-4'),
            )}
          >
            {!collapsed ? (
              <div className="px-2.5 pb-1.5 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {t(section.titleKey)}
              </div>
            ) : (
              sectionIdx > 0 && <div className="mx-auto my-1.5 h-px w-6 bg-border" />
            )}

            {section.items.map((item) => {
              const Icon = item.icon
              const label = t(item.labelKey)

              const isActive =
                item.to === '/'
                  ? location.pathname === '/' ||
                    location.pathname === '/social-media' ||
                    location.pathname === '/dr-wael'
                  : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)

              const navLink = (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    'group relative flex items-center rounded-lg text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                    collapsed ? 'size-9 justify-center p-0' : 'h-9 w-full gap-2.5 px-2.5',
                    isActive
                      ? 'bg-primary/10 font-semibold text-primary dark:bg-white/[0.08] dark:text-white'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-neutral-200',
                  )}
                >
                  {/* Subtle 2.5px active accent bar on the logical start edge */}
                  {isActive && (
                    <span
                      className={cn(
                        'absolute inset-y-1.5 start-0 w-[2.5px] rounded-e-full bg-primary',
                        collapsed && 'inset-y-2 start-0.5',
                      )}
                    />
                  )}
                  <Icon
                    className={cn(
                      'size-4 shrink-0 transition-colors',
                      isActive
                        ? 'text-primary'
                        : 'text-muted-foreground group-hover:text-foreground dark:text-neutral-400 dark:group-hover:text-neutral-200',
                    )}
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent
                      side="right"
                      sideOffset={8}
                      className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-xl"
                    >
                      {label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return navLink
            })}
          </div>
        ))}
      </nav>
    </TooltipProvider>
  )
}

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { displayName } = useSession()
  const name = displayName || 'Dr. Wael Elmayyah'
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast.success(t('sidebar.signedOut'))
    } catch {
      toast.error(t('common.errorTitle'))
    }
  }

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-e border-border bg-card transition-[width] duration-200 ease-in-out md:flex',
          collapsed ? 'w-[68px]' : 'w-[248px]',
        )}
      >
        {/* Brand Header */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-border',
            collapsed ? 'justify-center px-2' : 'px-4',
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="grid place-items-center">
                  <BrandMark className="size-7" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                WonderLearn
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex flex-col">
              <BrandLockup size="lg" />
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-1">
          <SidebarNav collapsed={collapsed} />
        </div>

        {/* Running timer — visible from every page, since the timer keeps
            running no matter where you navigate. Renders nothing when idle. */}
        <div className={cn('shrink-0 px-3 pb-2', collapsed && 'flex justify-center px-2')}>
          <GlobalTimerIndicator compact={collapsed} />
        </div>

        {/* Footer Actions: Log Out & Collapse Trigger */}
        <div
          className={cn(
            'mt-auto shrink-0 border-t border-border p-2',
            collapsed && 'px-1.5 py-2.5',
          )}
        >
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    aria-label={t('sidebar.signOut', 'Log out')}
                    className="grid size-9 place-items-center rounded-lg border border-border bg-accent/20 text-muted-foreground transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <LogOut className="size-4 text-red-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {t('sidebar.signOut', 'Log out')}
                </TooltipContent>
              </Tooltip>

              {onToggleCollapse && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onToggleCollapse}
                      aria-label="Expand sidebar"
                      className="grid size-9 place-items-center rounded-lg border border-border bg-accent/20 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                      <PanelLeftOpen className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    Expand sidebar
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={handleSignOut}
                className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-transparent p-2 text-start transition-all duration-150 hover:border-red-500/20 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-500 transition-colors group-hover:bg-red-500/20">
                  <LogOut className="size-3.5" />
                </div>
                <span className="truncate text-xs font-medium text-muted-foreground transition-colors group-hover:text-red-500">
                  {t('sidebar.signOut', 'Log out')}
                </span>
              </button>

              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <PanelLeftClose className="size-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
