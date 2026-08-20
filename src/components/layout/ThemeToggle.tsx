import { useTranslation } from 'react-i18next'
import { Languages, Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setLanguage, setTheme, type ThemeSetting } from '@/store/slices/settingsSlice'

const THEMES: { value: ThemeSetting; icon: typeof Sun; key: string }[] = [
  { value: 'dark', icon: Moon, key: 'settings.themeDark' },
  { value: 'light', icon: Sun, key: 'settings.themeLight' },
  { value: 'system', icon: Monitor, key: 'settings.themeSystem' },
]

export function ThemeToggle() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { theme, language } = useAppSelector((s) => s.settings)
  const Icon = THEMES.find((x) => x.value === theme)?.icon ?? Moon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t('settings.appearance')}>
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('settings.appearance')}</DropdownMenuLabel>
        {THEMES.map((item) => (
          <DropdownMenuItem key={item.value} onSelect={() => dispatch(setTheme(item.value))}>
            <item.icon />
            {t(item.key)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('settings.language')}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => dispatch(setLanguage(language === 'ar' ? 'en' : 'ar'))}>
          <Languages />
          {language === 'ar' ? 'English' : 'العربية'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
