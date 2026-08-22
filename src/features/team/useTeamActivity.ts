import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { parseISO } from 'date-fns'
import { useFiles } from '@/hooks/useFiles'
import { usePostsQuery } from '@/hooks/usePosts'
import { useSession } from '@/hooks/useSession'
import { useTimeEntries } from '@/hooks/useTimeTracker'
import { formatLastActive } from '@/lib/dates'
import type { TeamMember } from '@/types'

export interface MemberActivityStatus {
  isOnline: boolean
  lastActiveDate: Date | null
  label: string
  sublabel?: string
}

export function useTeamActivity() {
  const { i18n, t } = useTranslation()
  const { data: entries = [] } = useTimeEntries()
  const { data: posts = [] } = usePostsQuery()
  const { data: files = [] } = useFiles('all')
  const { displayName, session } = useSession()

  const lang = i18n.language

  const getMemberStatus = useMemo(() => {
    return (member: TeamMember): MemberActivityStatus => {
      const memberName = (member.name || '').trim().toLowerCase()
      const memberEmail = (member.email || '').trim().toLowerCase()
      const currentName = (displayName || '').trim().toLowerCase()
      const currentEmail = (session?.user?.email || '').trim().toLowerCase()

      // 1. Check if user is currently running a live time tracker timer
      const runningEntry = entries.find(
        (e) => (e.userName || '').trim().toLowerCase() === memberName && e.status === 'running',
      )

      if (runningEntry) {
        return {
          isOnline: true,
          lastActiveDate: new Date(),
          label: lang === 'ar' ? 'نشط الآن' : 'Active now',
          sublabel: lang === 'ar' ? 'يسجل الوقت' : 'Tracking time',
        }
      }

      // 2. Check if this is the currently authenticated session user
      const isCurrentUser =
        (currentName && currentName === memberName) ||
        (currentEmail && currentEmail === memberEmail)

      if (isCurrentUser) {
        return {
          isOnline: true,
          lastActiveDate: new Date(),
          label: lang === 'ar' ? 'نشط الآن' : 'Active now',
        }
      }

      // 3. Find most recent activity timestamp across time entries, files, posts, and member model
      const candidateDates: number[] = []

      if (member.lastActive) {
        const d = parseISO(member.lastActive).getTime()
        if (!isNaN(d)) candidateDates.push(d)
      }

      // Time entries
      for (const e of entries) {
        if ((e.userName || '').trim().toLowerCase() === memberName) {
          const raw = e.endTime || e.startTime || e.updatedAt || e.createdAt
          if (raw) {
            const d = parseISO(raw).getTime()
            if (!isNaN(d)) candidateDates.push(d)
          }
        }
      }

      // Uploaded files
      for (const f of files) {
        const uploader = (f.uploadedBy || '').trim().toLowerCase()
        if (uploader === memberName || uploader === memberEmail) {
          const raw = f.updatedAt || f.createdAt
          if (raw) {
            const d = parseISO(raw).getTime()
            if (!isNaN(d)) candidateDates.push(d)
          }
        }
      }

      // Assigned/created posts
      for (const p of posts) {
        const assignee = (p.assignee || '').trim().toLowerCase()
        const creator = (p.createdBy || '').trim().toLowerCase()
        if (assignee === memberName || creator === memberName) {
          if (p.date) {
            const raw = p.time ? `${p.date}T${p.time}:00` : p.date
            const d = parseISO(raw).getTime()
            if (!isNaN(d)) candidateDates.push(d)
          }
        }
      }

      if (candidateDates.length === 0) {
        return {
          isOnline: false,
          lastActiveDate: null,
          label: lang === 'ar' ? 'لا يوجد نشاط مسجل' : 'No recent activity',
        }
      }

      const maxTime = Math.max(...candidateDates)
      const maxDate = new Date(maxTime)
      const diffMinutes = Math.floor((Date.now() - maxTime) / (1000 * 60))
      const isOnline = diffMinutes < 15

      return {
        isOnline,
        lastActiveDate: maxDate,
        label: formatLastActive(maxDate, lang),
      }
    }
  }, [entries, files, posts, displayName, session, lang])

  return { getMemberStatus }
}
