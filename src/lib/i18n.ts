import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ar from '@/locales/ar.json'
import en from '@/locales/en.json'

function storedLanguage(): 'en' | 'ar' {
  try {
    const raw = localStorage.getItem('cadence-settings')
    if (raw && (JSON.parse(raw) as { language?: string }).language === 'ar') return 'ar'
  } catch {
    // default below
  }
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: storedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

export default i18n
