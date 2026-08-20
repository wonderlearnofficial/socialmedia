import { describe, expect, it } from 'vitest'
import { formatDateFull, formatMonthTitle, formatTime, toDateKey, toMonthKey } from './dates'

describe('date helpers', () => {
  it('formats 24h times as 12h with meridiem', () => {
    expect(formatTime('10:00')).toBe('10:00 AM')
    expect(formatTime('18:00')).toBe('6:00 PM')
    expect(formatTime('00:30')).toBe('12:30 AM')
  })

  it('builds day and month keys from a Date', () => {
    const d = new Date(2026, 7, 21)
    expect(toDateKey(d)).toBe('2026-08-21')
    expect(toMonthKey(d)).toBe('2026-08')
  })

  it('formats a month title', () => {
    expect(formatMonthTitle(new Date(2026, 7, 1))).toBe('August 2026')
  })

  it('formats a full date from a day key', () => {
    expect(formatDateFull('2026-08-21')).toBe('August 21, 2026')
  })
})
