import { describe, expect, it } from 'vitest'
import { parseShareId } from './mockServer'

describe('parseShareId', () => {
  it('recovers the workspace and month from a generated share id', () => {
    expect(parseShareId('wonderlearn-august-2026-k2ej20')).toEqual({
      workspace: 'wonderlearn',
      month: '2026-08',
    })
    expect(parseShareId('dr_wael-january-2027-abc123')).toEqual({
      workspace: 'dr_wael',
      month: '2027-01',
    })
    expect(parseShareId('wonderlearn-december-2025-zz')).toEqual({
      workspace: 'wonderlearn',
      month: '2025-12',
    })
  })

  it('rejects ids that do not carry a real workspace and month', () => {
    expect(parseShareId('notaworkspace-august-2026-abc')).toBeNull()
    expect(parseShareId('wonderlearn-notamonth-2026-abc')).toBeNull()
    expect(parseShareId('wonderlearn-august-abc')).toBeNull()
    expect(parseShareId('random-id')).toBeNull()
  })
})
