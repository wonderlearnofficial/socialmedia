import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/store/hooks'

/**
 * Mirrors settings state onto <html>: theme class, language and direction.
 * The initial paint is handled by an inline script in index.html to avoid a flash.
 */
export function ThemeSync() {
  const { theme, language } = useAppSelector((s) => s.settings)
  const { i18n } = useTranslation()

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && Boolean(media?.matches))
      root.classList.toggle('dark', dark)
    }

    apply()
    if (theme !== 'system' || !media) return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    if (i18n.language !== language) void i18n.changeLanguage(language)
    const root = document.documentElement
    root.lang = language
    root.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language, i18n])

  return null
}
