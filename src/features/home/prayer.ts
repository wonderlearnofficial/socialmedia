/**
 * Prayer times data layer.
 *
 * One request per month via Aladhan, cached in localStorage so the widget
 * works offline and never fetches on render. The mock month keeps the widget
 * functional with no network; flip USE_LIVE_PRAYER_API to go live.
 *
 * The calculation method is a setting, not a constant — different authorities
 * differ by 20+ minutes. Defaults: Egyptian General Authority, Asr Standard.
 */
export const USE_LIVE_PRAYER_API = false

export interface PrayerDay {
  /** yyyy-MM-dd */ date: string
  Fajr: string
  Sunrise: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
}

interface AladhanTimings {
  Fajr: string
  Sunrise: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
}
interface AladhanDay {
  date: { gregorian: { date: string } }
  timings: AladhanTimings
}

/** method: 5 Egyptian GA · 4 Umm al-Qura · 3 MWL · 2 ISNA · 1 Karachi.
 *  school: 0 Standard/Shafi · 1 Hanafi (Asr).
 *  latitudeAdjustmentMethod=3 (AngleBased) keeps high latitudes sane. */
export async function fetchAladhanMonth(
  lat: number,
  lng: number,
  method: number,
  school: 0 | 1,
  year: number,
  month: number,
): Promise<PrayerDay[]> {
  const url = `https://api.aladhan.com/v1/calendar?latitude=${lat}&longitude=${lng}&method=${method}&school=${school}&month=${month}&year=${year}&latitudeAdjustmentMethod=3`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Aladhan ${res.status}`)
  const json = (await res.json()) as { data: AladhanDay[] }
  const strip = (t: string) => t.slice(0, 5) // "04:41 (EET)" → "04:41"
  return json.data.map((d) => {
    const [dd, mm, yyyy] = d.date.gregorian.date.split('-')
    return {
      date: `${yyyy}-${mm}-${dd}`,
      Fajr: strip(d.timings.Fajr),
      Sunrise: strip(d.timings.Sunrise),
      Dhuhr: strip(d.timings.Dhuhr),
      Asr: strip(d.timings.Asr),
      Maghrib: strip(d.timings.Maghrib),
      Isha: strip(d.timings.Isha),
    }
  })
}

/** Cairo-ish times, Egyptian GA — keeps the widget working offline/mock. */
export function mockPrayerMonth(): PrayerDay[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const days = new Date(year, month + 1, 0).getDate()
  const t = (h: number, m: number, drift: number) => {
    const total = h * 60 + m + Math.round(drift)
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }
  return Array.from({ length: days }, (_, i) => ({
    date: `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
    Fajr: t(4, 34, i * 0.6),
    Sunrise: t(6, 8, i * 0.5),
    Dhuhr: t(12, 4, i * 0.1),
    Asr: t(15, 38, -i * 0.2),
    Maghrib: t(18, 42, -i * 0.8),
    Isha: t(20, 2, -i * 0.9),
  }))
}

export const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
export type PrayerName = (typeof PRAYERS)[number]
