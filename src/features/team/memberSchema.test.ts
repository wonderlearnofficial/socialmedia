import { describe, expect, it } from 'vitest'
import { memberSchema } from './memberSchema'

const valid = { name: 'Mazen', role: 'Content Producer', email: 'mazen@example.com' }

describe('memberSchema', () => {
  it('trims text fields', () => {
    const parsed = memberSchema.parse({ ...valid, name: '  Mazen  ', role: ' Producer ' })
    expect(parsed.name).toBe('Mazen')
    expect(parsed.role).toBe('Producer')
  })

  it.each([
    ['name', { ...valid, name: '   ' }, 'team.nameRequired'],
    ['role', { ...valid, role: '' }, 'team.roleRequired'],
    ['email', { ...valid, email: 'not-an-email' }, 'team.emailInvalid'],
  ])('rejects a missing or malformed %s', (_field, input, messageKey) => {
    const result = memberSchema.safeParse(input)
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.message)).toContain(messageKey)
  })
})
