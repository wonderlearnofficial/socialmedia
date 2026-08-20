import { describe, expect, it } from 'vitest'
import { monthFromShareId } from './mockServer'

describe('monthFromShareId', () => {
  it('recovers the month from a generated share id', () => {
    expect(monthFromShareId('august-2026-k2ej20')).toBe('2026-08')
    expect(monthFromShareId('january-2027-abc123')).toBe('2027-01')
    expect(monthFromShareId('december-2025-zz')).toBe('2025-12')
  })

  it('rejects ids that do not carry a real month', () => {
    expect(monthFromShareId('notamonth-2026-abc')).toBeNull()
    expect(monthFromShareId('august-abc')).toBeNull()
    expect(monthFromShareId('random-id')).toBeNull()
  })
})
