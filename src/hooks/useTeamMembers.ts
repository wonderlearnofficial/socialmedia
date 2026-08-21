import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { TeamMemberInput, WorkspaceId } from '@/types'

export function useTeamMembers(workspace: WorkspaceId) {
  return useQuery({
    queryKey: ['team', workspace],
    queryFn: () => api.listTeamMembers(workspace),
  })
}

export function useCreateTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TeamMemberInput) => api.createTeamMember(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
}
