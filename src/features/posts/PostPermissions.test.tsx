import { describe, expect, it } from 'vitest'
import {
  canCreatePost,
  canDeletePost,
  canEditPost,
  canMarkAsDone,
  canRequestChanges,
  canUploadMedia,
} from '@/lib/permissions'

describe('Social Media Calendar & Posts RBAC Permissions Matrix', () => {
  const managementRoles = ['Super Admin', 'Founder', 'Social Media Manager', 'Art Director']
  const specializedRoles = ['Graphic Designer', 'Instructional Designer', 'Archive Master']
  const financeRole = 'Accountant'

  describe('1. ➕ Add & Schedule New Post (canCreatePost)', () => {
    it('grants permission to Super Admin, Founder, SMM, and Art Director', () => {
      managementRoles.forEach((role) => {
        expect(canCreatePost(role)).toBe(true)
      })
    })

    it('denies permission to Graphic Designer, Instructional Designer, Archive Master, and Accountant', () => {
      ;[...specializedRoles, financeRole].forEach((role) => {
        expect(canCreatePost(role)).toBe(false)
      })
    })
  })

  describe('2. ✏️ Edit Post & Reschedule (canEditPost)', () => {
    it('grants permission to Super Admin, Founder, SMM, and Art Director', () => {
      managementRoles.forEach((role) => {
        expect(canEditPost(role)).toBe(true)
      })
    })

    it('denies permission to Graphic Designer, Instructional Designer, Archive Master, and Accountant', () => {
      ;[...specializedRoles, financeRole].forEach((role) => {
        expect(canEditPost(role)).toBe(false)
      })
    })
  })

  describe('3. 🗑️ Delete Post (canDeletePost)', () => {
    it('grants permission to Super Admin, Founder, and Social Media Manager ONLY', () => {
      expect(canDeletePost('Super Admin')).toBe(true)
      expect(canDeletePost('Founder')).toBe(true)
      expect(canDeletePost('Social Media Manager')).toBe(true)
    })

    it('denies permission to Art Director, Graphic Designer, Instructional Designer, Archive Master, and Accountant', () => {
      expect(canDeletePost('Art Director')).toBe(false)
      expect(canDeletePost('Graphic Designer')).toBe(false)
      expect(canDeletePost('Instructional Designer')).toBe(false)
      expect(canDeletePost('Archive Master')).toBe(false)
      expect(canDeletePost('Accountant')).toBe(false)
    })
  })

  describe('4. 🔄 Request Changes & Feedback (canRequestChanges)', () => {
    it('grants permission to Super Admin, Founder, SMM, and Art Director', () => {
      managementRoles.forEach((role) => {
        expect(canRequestChanges(role)).toBe(true)
      })
    })

    it('denies permission to Graphic Designer, Instructional Designer, Archive Master, and Accountant', () => {
      ;[...specializedRoles, financeRole].forEach((role) => {
        expect(canRequestChanges(role)).toBe(false)
      })
    })
  })

  describe('5. ✅ Mark as Done / Approve (canMarkAsDone)', () => {
    it('grants permission to Super Admin, Founder, SMM, and Art Director', () => {
      managementRoles.forEach((role) => {
        expect(canMarkAsDone(role)).toBe(true)
      })
    })

    it('denies permission to Graphic Designer, Instructional Designer, Archive Master, and Accountant', () => {
      ;[...specializedRoles, financeRole].forEach((role) => {
        expect(canMarkAsDone(role)).toBe(false)
      })
    })
  })

  describe('6. 📤 Upload / Replace Deliverables (canUploadMedia)', () => {
    it('grants upload permission to all creative and management roles', () => {
      ;[...managementRoles, ...specializedRoles].forEach((role) => {
        expect(canUploadMedia(role)).toBe(true)
      })
    })

    it('denies upload permission to Accountant', () => {
      expect(canUploadMedia(financeRole)).toBe(false)
    })
  })
})
