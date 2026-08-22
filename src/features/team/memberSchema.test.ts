import { describe, expect, it } from 'vitest'
import { memberSchema } from './memberSchema'

const valid = { name: 'Mazen', role: 'Graphic Designer', email: 'mazen@example.com' }

describe('memberSchema', () => {
  it('trims text fields', () => {
    const parsed = memberSchema.parse({ ...valid, name: '  Mazen  ', role: ' Art Director ' })
    expect(parsed.name).toBe('Mazen')
    expect(parsed.role).toBe('Art Director')
  })

  it('defaults role to Member when not provided or empty', () => {
    const parsedNoRole = memberSchema.parse({ name: 'Mazen', email: 'mazen@example.com' })
    expect(parsedNoRole.role).toBe('Member')

    const parsedEmptyRole = memberSchema.parse({
      name: 'Mazen',
      role: '',
      email: 'mazen@example.com',
    })
    expect(parsedEmptyRole.role).toBe('Member')
  })

  it.each([
    ['name', { ...valid, name: '   ' }, 'team.nameRequired'],
    ['email', { ...valid, email: 'not-an-email' }, 'team.emailInvalid'],
  ])('rejects a missing or malformed %s', (_field, input, messageKey) => {
    const result = memberSchema.safeParse(input)
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.message)).toContain(messageKey)
  })
})
