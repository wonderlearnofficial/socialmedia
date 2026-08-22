import { useSession } from '@/hooks/useSession'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import {
  canCreatePost,
  canDeletePost,
  canEditPost,
  canManageCalendar,
  canManageTeam,
  canMarkAsDone,
  canRequestChanges,
  canUploadMedia,
  canViewAndFilterCalendar,
  normalizeRole,
  type CanonicalRole,
} from '@/lib/permissions'
import { useAppSelector } from '@/store/hooks'

export function usePermissions() {
  const { displayName, session } = useSession()
  const { data: teamMembers } = useTeamMembers()
  const trackingAs = useAppSelector((s) => s.settings.trackingAs)

  const activeName = trackingAs || displayName || 'Dr. Wael Elmayyah'
  const currentMember = teamMembers?.find(
    (m) =>
      m.name.toLowerCase() === activeName.toLowerCase() ||
      m.id === trackingAs ||
      (!trackingAs &&
        session?.user.email &&
        m.email.toLowerCase() === session.user.email.toLowerCase()),
  )

  const rawRole = currentMember?.role || 'Founder'
  const role: CanonicalRole = normalizeRole(rawRole)

  const isSuperAdmin = role === 'super_admin'
  const isFounder = role === 'founder' || isSuperAdmin
  const isArtDirector = role === 'art_director'
  const isSMM = role === 'smm'

  return {
    currentMember,
    activeName: currentMember?.name || activeName,
    rawRole,
    role,
    isSuperAdmin,
    isFounder,
    isArtDirector,
    isSMM,
    // Universal Permissions
    canSwitchAccounts: canViewAndFilterCalendar(rawRole),
    canViewCalendar: canViewAndFilterCalendar(rawRole),
    canFilterPosts: canViewAndFilterCalendar(rawRole),
    canViewTeam: true,
    // Calendar Permissions
    canCreatePost: canCreatePost(rawRole),
    canManageCalendar: canManageCalendar(rawRole),
    canEditPost: canEditPost(rawRole),
    canDeletePost: canDeletePost(rawRole),
    canRequestChanges: canRequestChanges(rawRole),
    canMarkAsDone: canMarkAsDone(rawRole),
    canUploadMedia: canUploadMedia(rawRole),
    canReschedulePost: canCreatePost(rawRole),
    // Team Page Permissions (Founder & Super Admin ONLY)
    canManageTeam: canManageTeam(rawRole),
    canAddTeamMember: canManageTeam(rawRole),
    canEditTeamMember: canManageTeam(rawRole),
    canDeleteTeamMember: canManageTeam(rawRole),
  }
}
