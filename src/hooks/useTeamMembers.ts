import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { TeamMemberInput } from '@/types'

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team'],
    queryFn: () => api.listTeamMembers(),
  })
}

export function useCreateTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TeamMemberInput) => api.createTeamMember(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
}

interface UpdateTeamMemberVars {
  id: string
  patch: Partial<TeamMemberInput>
  /** Set only when the name actually changed, so post assignments follow it. */
  reassign?: { from: string; to: string }
}

export function useUpdateTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch, reassign }: UpdateTeamMemberVars) => {
      const member = await api.updateTeamMember(id, patch)
      if (reassign) await api.renameAssignee(reassign.from, reassign.to)
      return member
    },
    onSuccess: (_member, { reassign }) => {
      qc.invalidateQueries({ queryKey: ['team'] })
      // The roster rename rewrote posts.assignee too — those rows are stale now.
      if (reassign) qc.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export function useDeleteTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteTeamMember(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
}
