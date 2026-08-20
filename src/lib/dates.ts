import { format, parse, parseISO } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import type { Post } from '@/types'

export type AppLanguage = 'en' | 'ar'

const locales = { en: enUS, ar }

export function dateLocale(lang: string) {
  return lang === 'ar' ? locales.ar : locales.en
}

/** yyyy-MM-dd from a Date */
export function toDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

/** yyyy-MM from a Date */
export function toMonthKey(date: Date) {
  return format(date, 'yyyy-MM')
}

export function postDateTime(post: Post) {
  return parseISO(`${post.date}T${post.time}:00`)
}

/** "10:00 AM" from "10:00" */
export function formatTime(time: string, lang = 'en') {
  const d = parse(time, 'HH:mm', new Date())
  return format(d, 'h:mm a', { locale: dateLocale(lang) })
}

/** "August 2026" */
export function formatMonthTitle(date: Date, lang = 'en') {
  return format(date, 'MMMM yyyy', { locale: dateLocale(lang) })
}

/** "Friday, August 21" */
export function formatDayLong(dateKey: string, lang = 'en') {
  return format(parseISO(dateKey), 'EEEE, MMMM d', { locale: dateLocale(lang) })
}

/** "August 21, 2026" */
export function formatDateFull(dateKey: string, lang = 'en') {
  return format(parseISO(dateKey), 'MMMM d, yyyy', { locale: dateLocale(lang) })
}

/** "Aug 21" */
export function formatDateShort(dateKey: string, lang = 'en') {
  return format(parseISO(dateKey), 'MMM d', { locale: dateLocale(lang) })
}

/** "Aug 21 · 2:30 PM" from an ISO timestamp */
export function formatTimestamp(iso: string, lang = 'en') {
  return format(parseISO(iso), 'MMM d · h:mm a', { locale: dateLocale(lang) })
}
