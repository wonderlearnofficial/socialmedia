import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { CompanyInput, ProjectInput, TimeEntryInput, WorkItemInput } from '@/types'

/** Every mutation in this module can shift what a report shows, so they all
 *  invalidate the same four keys rather than each guessing which ones moved. */
const TIME_KEYS = [['companies'], ['projects'], ['workItems'], ['timeEntries']] as const

function useTimeMutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      TIME_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }))
    },
  })
}

export function useCompanies() {
  return useQuery({ queryKey: ['companies'], queryFn: () => api.listCompanies() })
}

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: () => api.listProjects() })
}

export function useWorkItems() {
  return useQuery({ queryKey: ['workItems'], queryFn: () => api.listWorkItems() })
}

export function useTimeEntries() {
  return useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => api.listTimeEntries(),
    // Someone else's timer starting or stopping should show up without a
    // reload — that's what the "who is working on this" warning reads.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useCreateCompany() {
  return useTimeMutation((input: CompanyInput) => api.createCompany(input))
}

export function useUpdateCompany() {
  return useTimeMutation(({ id, patch }: { id: string; patch: Partial<CompanyInput> }) =>
    api.updateCompany(id, patch),
  )
}

export function useDeleteCompany() {
  return useTimeMutation((id: string) => api.deleteCompany(id))
}

export function useCreateProject() {
  return useTimeMutation((input: ProjectInput) => api.createProject(input))
}

export function useUpdateProject() {
  return useTimeMutation(({ id, patch }: { id: string; patch: Partial<ProjectInput> }) =>
    api.updateProject(id, patch),
  )
}

export function useDeleteProject() {
  return useTimeMutation((id: string) => api.deleteProject(id))
}

export function useCreateWorkItem() {
  return useTimeMutation((input: WorkItemInput) => api.createWorkItem(input))
}

export function useUpdateWorkItem() {
  return useTimeMutation(({ id, patch }: { id: string; patch: Partial<WorkItemInput> }) =>
    api.updateWorkItem(id, patch),
  )
}

export function useDeleteWorkItem() {
  return useTimeMutation((id: string) => api.deleteWorkItem(id))
}

export function useCreateTimeEntry() {
  return useTimeMutation((input: TimeEntryInput) => api.createTimeEntry(input))
}

export function useUpdateTimeEntry() {
  return useTimeMutation(({ id, patch }: { id: string; patch: Partial<TimeEntryInput> }) =>
    api.updateTimeEntry(id, patch),
  )
}

export function useDeleteTimeEntry() {
  return useTimeMutation((id: string) => api.deleteTimeEntry(id))
}
