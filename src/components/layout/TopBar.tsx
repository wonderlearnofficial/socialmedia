import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Check,
  Languages,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  User,
  UserCheck,
} from 'lucide-react'
import { BrandMark } from '@/components/shared/Brand'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { GlobalTimerIndicator } from '@/features/time/GlobalTimerIndicator'
import { usePermissions } from '@/hooks/usePermissions'
import { useSession } from '@/hooks/useSession'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { cn } from '@/lib/utils'
import { supabase } from '@/services/supabaseClient'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setLanguage, setTheme, setTrackingAs } from '@/store/slices/settingsSlice'

interface TopBarProps {
  onOpenMenu: () => void
}

export function TopBar({ onOpenMenu }: TopBarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const theme = useAppSelector((s) => s.settings.theme)
  const language = useAppSelector((s) => s.settings.language)
  const trackingAs = useAppSelector((s) => s.settings.trackingAs)
  const { data: teamMembers = [] } = useTeamMembers()
  const { activeName, rawRole, currentMember, isSuperAdmin } = usePermissions()

  const name = activeName || 'Dr. Wael Elmayyah'
  const role = rawRole || 'Founder'
  const avatarUrl = currentMember?.avatarUrl

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const handleToggleTheme = () => {
    dispatch(setTheme(isDark ? 'light' : 'dark'))
  }

  const handleToggleLanguage = () => {
    dispatch(setLanguage(language === 'ar' ? 'en' : 'ar'))
  }

  const handleSwitchUser = (memberId: string, memberName: string, memberRole: string) => {
    dispatch(setTrackingAs(memberId))
    toast.success(`Switched active user to ${memberName} (${memberRole})`)
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast.success(t('sidebar.signedOut', 'Signed out'))
    } catch {
      toast.error(t('common.errorTitle', 'Error signing out'))
    }
  }

  const isSettingsActive = location.pathname === '/settings'
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.localhost') ||
      window.location.hostname === '[::1]')

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
      {/* Left side: Mobile menu toggle + Mobile brand */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={onOpenMenu}
          aria-label={t('common.openMenu')}
        >
          <Menu className="size-4" />
        </Button>
        <div className="flex items-center gap-2 md:hidden">
          <BrandMark className="size-6" />
          <span className="text-xs font-bold text-foreground">WonderLearn</span>
        </div>
      </div>

      {/* Right side: Global Timer + Language + Light/Dark Switcher + Settings + Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Active Timer Indicator */}
        <div className="hidden sm:block">
          <GlobalTimerIndicator compact />
        </div>

        <TooltipProvider delayDuration={100}>
          {/* 1-Click Language Switcher (EN / العربية) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleToggleLanguage}
                aria-label={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
                className="size-8 rounded-lg border border-border bg-accent/20 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Languages className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {language === 'ar' ? 'English' : 'العربية'}
            </TooltipContent>
          </Tooltip>

          {/* 1-Click Theme Switcher Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleToggleTheme}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="size-8 rounded-lg border border-border bg-accent/20 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {isDark ? (
                  <Sun className="size-4 text-amber-400" />
                ) : (
                  <Moon className="size-4 text-neutral-700 dark:text-neutral-300" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {isDark
                ? t('settings.themeLight', 'Light mode')
                : t('settings.themeDark', 'Dark mode')}
            </TooltipContent>
          </Tooltip>

          {/* Quick Settings Access */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => navigate('/settings')}
                aria-label={t('nav.settings', 'Settings')}
                className={cn(
                  'size-8 rounded-lg border border-border transition-colors',
                  isSettingsActive
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'bg-accent/20 text-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Settings className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {t('nav.settings', 'Settings')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* User Profile & Role Switcher Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group flex items-center gap-2.5 rounded-full border border-border bg-accent/30 py-1 ps-1 pe-3 transition-all hover:border-primary/40 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <Avatar className="size-7 shrink-0 rounded-full border border-border transition-transform group-hover:scale-105">
                {avatarUrl && (
                  <AvatarImage src={avatarUrl} alt={name} className="rounded-full object-cover" />
                )}
                <AvatarFallback className="rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-start sm:block">
                <p className="truncate text-xs font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
                  {name}
                </p>
                <p className="truncate text-[10px] leading-tight text-muted-foreground">{role}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 p-1.5 rounded-xl border border-white/[0.08] bg-[#161B22] shadow-2xl"
          >
            <div className="px-2.5 py-2">
              <p className="text-xs font-bold text-white truncate">{name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/30"
                >
                  {role}
                </Badge>
                {isLocalhost && trackingAs && (
                  <span className="text-[10px] text-amber-400 font-medium">(Switched)</span>
                )}
              </div>
            </div>

            <DropdownMenuSeparator className="bg-white/[0.06]" />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="text-xs cursor-pointer rounded-lg"
              >
                <User className="size-3.5 me-2 text-muted-foreground" />
                <span>My Profile</span>
              </DropdownMenuItem>
              {isSuperAdmin && (
                <DropdownMenuItem
                  onClick={() => navigate('/authority-matrix')}
                  className="text-xs cursor-pointer rounded-lg"
                >
                  <ShieldCheck className="size-3.5 me-2 text-primary" />
                  <span>Authority Matrix</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>

            {/* Role / User Switcher for Localhost / Dev Testing Only */}
            {isLocalhost && (
              <>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs cursor-pointer rounded-lg text-amber-300">
                    <UserCheck className="size-3.5 me-2 text-amber-400" />
                    <span>Switch Role (Localhost Only)</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64 p-1.5 rounded-xl border border-white/[0.08] bg-[#161B22] shadow-2xl max-h-80 overflow-y-auto">
                    <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                      Localhost Test Accounts
                    </DropdownMenuLabel>
                    {teamMembers.map((m) => {
                      const isCurrent =
                        currentMember?.id === m.id || name.toLowerCase() === m.name.toLowerCase()
                      return (
                        <DropdownMenuItem
                          key={m.id}
                          onClick={() => handleSwitchUser(m.id, m.name, m.role)}
                          className={cn(
                            'flex items-center justify-between text-xs cursor-pointer rounded-lg py-1.5 px-2',
                            isCurrent && 'bg-primary/10 text-primary font-semibold',
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs text-white">{m.name}</p>
                            <p className="truncate text-[10px] text-muted-foreground">{m.role}</p>
                          </div>
                          {isCurrent && <Check className="size-3.5 text-primary shrink-0 ms-2" />}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}

            <DropdownMenuSeparator className="bg-white/[0.06]" />

            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-xs text-red-400 cursor-pointer rounded-lg"
            >
              <LogOut className="size-3.5 me-2" />
              <span>{t('sidebar.signOut', 'Sign Out')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
