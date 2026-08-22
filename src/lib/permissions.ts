export type CanonicalRole =
  | 'super_admin'
  | 'founder'
  | 'smm'
  | 'art_director'
  | 'graphic_designer'
  | 'instructional_designer'
  | 'archive_king'
  | 'accountant'
  | 'member'

export function normalizeRole(roleStr?: string | null): CanonicalRole {
  if (!roleStr) return 'founder'
  const lower = roleStr.toLowerCase().trim()

  if (lower.includes('super')) return 'super_admin'
  if (lower.includes('founder') || lower.includes('lead')) return 'founder'
  if (lower.includes('social') || lower.includes('manager') || lower === 'smm') return 'smm'
  if (lower.includes('art')) return 'art_director'
  if (lower.includes('graphic') || lower.includes('designer')) {
    if (lower.includes('instructional')) return 'instructional_designer'
    return 'graphic_designer'
  }
  if (lower.includes('instructional') || lower.includes('curriculum'))
    return 'instructional_designer'
  if (lower.includes('archive')) return 'archive_king'
  if (lower.includes('accountant') || lower.includes('finance')) return 'accountant'

  return 'member'
}

/**
 * Universal Calendar permissions:
 * All 8 roles can switch accounts, browse timeline views, and filter/search posts.
 */
export function canViewAndFilterCalendar(_roleStr?: string | null): boolean {
  return true
}

/**
 * Add / Create Post permission:
 * Super Admin, Founder, Social Media Manager, and Art Director.
 */
export function canCreatePost(roleStr?: string | null): boolean {
  const role = normalizeRole(roleStr)
  return role === 'super_admin' || role === 'founder' || role === 'smm' || role === 'art_director'
}

export const canManageCalendar = canCreatePost

/**
 * Edit Post permission:
 * Super Admin, Founder, Social Media Manager, and Art Director.
 */
export function canEditPost(roleStr?: string | null): boolean {
  const role = normalizeRole(roleStr)
  return role === 'super_admin' || role === 'founder' || role === 'smm' || role === 'art_director'
}

/**
 * Delete Post permission:
 * Super Admin, Founder, and Social Media Manager only.
 */
export function canDeletePost(roleStr?: string | null): boolean {
  const role = normalizeRole(roleStr)
  return role === 'super_admin' || role === 'founder' || role === 'smm'
}

/**
 * Request Changes & Review Feedback permission:
 * Super Admin, Founder, Social Media Manager, and Art Director.
 */
export function canRequestChanges(roleStr?: string | null): boolean {
  const role = normalizeRole(roleStr)
  return role === 'super_admin' || role === 'founder' || role === 'smm' || role === 'art_director'
}

/**
 * Mark as Done / Final Approval permission:
 * Super Admin, Founder, Social Media Manager, and Art Director.
 */
export function canMarkAsDone(roleStr?: string | null): boolean {
  const role = normalizeRole(roleStr)
  return role === 'super_admin' || role === 'founder' || role === 'smm' || role === 'art_director'
}

/**
 * Upload / Replace Deliverables permission:
 * All roles except Accountant.
 */
export function canUploadMedia(roleStr?: string | null): boolean {
  const role = normalizeRole(roleStr)
  return role !== 'accountant' && role !== 'member'
}

/**
 * Team Management permissions:
 * - View Team Directory & Details: All 8 roles.
 * - Add, Edit, Delete Team Members & Generate PINs: Founder and Super Admin ONLY.
 */
export function canManageTeam(roleStr?: string | null): boolean {
  const role = normalizeRole(roleStr)
  return role === 'super_admin' || role === 'founder'
}
