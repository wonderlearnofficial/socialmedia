import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}

/**
 * Absolute URL for an in-app path, honouring the deploy base so links keep
 * working when the app is served from a subpath (e.g. GitHub Pages).
 */
export function appUrl(path = '') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}/${path.replace(/^\//, '')}`
}
