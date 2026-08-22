import { describe, expect, it } from 'vitest'
import {
  canCreatePost,
  canDeletePost,
  canEditPost,
  canManageCalendar,
  canMarkAsDone,
  canRequestChanges,
  canViewAndFilterCalendar,
  normalizeRole,
} from './permissions'

describe('normalizeRole', () => {
  it('correctly normalizes all 8 organizational roles', () => {
    expect(normalizeRole('Super Admin')).toBe('super_admin')
    expect(normalizeRole('Founder')).toBe('founder')
    expect(normalizeRole('Founder and Lead')).toBe('founder')
    expect(normalizeRole('Social Media Manager')).toBe('smm')
    expect(normalizeRole('Art Director')).toBe('art_director')
    expect(normalizeRole('Graphic Designer')).toBe('graphic_designer')
    expect(normalizeRole('Instructional Designer')).toBe('instructional_designer')
    expect(normalizeRole('Archive Master')).toBe('archive_king')
    expect(normalizeRole('Accountant')).toBe('accountant')
  })

  it('handles empty or unrecognized roles', () => {
    expect(normalizeRole('')).toBe('founder')
    expect(normalizeRole(null)).toBe('founder')
    expect(normalizeRole('Unknown Specialist')).toBe('member')
  })
})

describe('Universal Calendar Permissions', () => {
  it('allows all roles to switch accounts, view, and filter', () => {
    const roles = [
      'Super Admin',
      'Founder',
      'Social Media Manager',
      'Art Director',
      'Graphic Designer',
      'Instructional Designer',
      'Archive Master',
      'Accountant',
    ]
    roles.forEach((r) => {
      expect(canViewAndFilterCalendar(r)).toBe(true)
    })
  })
})

describe('Differentiated Operational Permissions', () => {
  it('canCreatePost: allows Super Admin, Founder, SMM, and Art Director', () => {
    expect(canCreatePost('Super Admin')).toBe(true)
    expect(canCreatePost('Founder')).toBe(true)
    expect(canCreatePost('Social Media Manager')).toBe(true)
    expect(canCreatePost('Art Director')).toBe(true)
    expect(canCreatePost('Graphic Designer')).toBe(false)
    expect(canCreatePost('Instructional Designer')).toBe(false)
    expect(canCreatePost('Archive Master')).toBe(false)
    expect(canCreatePost('Accountant')).toBe(false)
  })

  it('canDeletePost: allows Super Admin, Founder, and SMM only', () => {
    expect(canDeletePost('Super Admin')).toBe(true)
    expect(canDeletePost('Founder')).toBe(true)
    expect(canDeletePost('Social Media Manager')).toBe(true)
    expect(canDeletePost('Art Director')).toBe(false)
    expect(canDeletePost('Graphic Designer')).toBe(false)
    expect(canDeletePost('Instructional Designer')).toBe(false)
    expect(canDeletePost('Archive Master')).toBe(false)
    expect(canDeletePost('Accountant')).toBe(false)
  })

  it('canRequestChanges: allows Super Admin, Founder, SMM, and Art Director', () => {
    expect(canRequestChanges('Super Admin')).toBe(true)
    expect(canRequestChanges('Founder')).toBe(true)
    expect(canRequestChanges('Social Media Manager')).toBe(true)
    expect(canRequestChanges('Art Director')).toBe(true)
    expect(canRequestChanges('Accountant')).toBe(false)
  })

  it('canMarkAsDone: allows Super Admin, Founder, SMM, and Art Director', () => {
    expect(canMarkAsDone('Super Admin')).toBe(true)
    expect(canMarkAsDone('Founder')).toBe(true)
    expect(canMarkAsDone('Social Media Manager')).toBe(true)
    expect(canMarkAsDone('Art Director')).toBe(true)
    expect(canMarkAsDone('Accountant')).toBe(false)
  })
})
