import { describe, expect, it } from 'vitest'
import { canManageTeam, normalizeRole } from '@/lib/permissions'

describe('Team Page RBAC Permissions Matrix', () => {
  describe('canManageTeam (Add, Edit, Delete members, Manage PINs)', () => {
    it('grants full management authority to Super Admin and Founder ONLY', () => {
      expect(canManageTeam('Super Admin')).toBe(true)
      expect(canManageTeam('Founder')).toBe(true)
      expect(canManageTeam('Founder and Lead')).toBe(true)
    })

    it('denies management authority to all other roles', () => {
      const nonAdminRoles = [
        'Social Media Manager',
        'Art Director',
        'Graphic Designer',
        'Instructional Designer',
        'Archive Master',
        'Accountant',
      ]

      nonAdminRoles.forEach((role) => {
        expect(canManageTeam(role)).toBe(false)
      })
    })
  })
})
