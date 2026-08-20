import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Monitor, Moon, RotateCcw, Sun } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { postsKey } from '@/hooks/usePosts'
import { cn } from '@/lib/utils'
import { resetDemoData } from '@/services/mockServer'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setLanguage,
  setTheme,
  setWorkspaceName,
  type ThemeSetting,
} from '@/store/slices/settingsSlice'

const THEMES: { value: ThemeSetting; icon: typeof Sun; key: string }[] = [
  { value: 'dark', icon: Moon, key: 'settings.themeDark' },
  { value: 'light', icon: Sun, key: 'settings.themeLight' },
  { value: 'system', icon: Monitor, key: 'settings.themeSystem' },
]

export function SettingsPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const qc = useQueryClient()
  const { theme, language, workspaceName } = useAppSelector((s) => s.settings)

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.appearance')}</CardTitle>
            <CardDescription>{t('settings.appearanceBody')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {THEMES.map((item) => {
              const Icon = item.icon
              const active = theme === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => dispatch(setTheme(item.value))}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                    active ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                  )}
                >
                  <Icon className="size-3.5" />
                  {t(item.key)}
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language')}</CardTitle>
            <CardDescription>{t('settings.languageBody')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(['en', 'ar'] as const).map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => dispatch(setLanguage(lng))}
                aria-pressed={language === lng}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                  language === lng ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                )}
              >
                {lng === 'en' ? 'English' : 'العربية (RTL)'}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.workspace')}</CardTitle>
            <CardDescription>{t('settings.workspaceBody')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="workspace-name">{t('settings.workspaceName')}</Label>
            <Input
              id="workspace-name"
              value={workspaceName}
              onChange={(e) => dispatch(setWorkspaceName(e.target.value))}
              className="max-w-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.data')}</CardTitle>
            <CardDescription>{t('settings.dataBody')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                resetDemoData()
                await qc.invalidateQueries({ queryKey: postsKey })
                toast.success(t('settings.resetDone'))
              }}
            >
              <RotateCcw />
              {t('settings.reset')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
