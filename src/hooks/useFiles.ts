import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { FileRecordInput, FolderInput, WorkspaceId } from '@/types'

export function useFolders(workspace: WorkspaceId) {
  return useQuery({
    queryKey: ['folders', workspace],
    queryFn: () => api.listFolders(workspace),
  })
}

export function useCreateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: FolderInput) => api.createFolder(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}

export function useUpdateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FolderInput> }) =>
      api.updateFolder(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}

export function useDeleteFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteFolder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}

export function useFiles(workspace: WorkspaceId) {
  return useQuery({
    queryKey: ['files', workspace],
    queryFn: () => api.listFiles(workspace),
  })
}

export function useCreateFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: FileRecordInput) => api.createFile(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  })
}

export function useUpdateFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FileRecordInput> }) =>
      api.updateFile(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  })
}

export function useDeleteFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteFile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files'] }),
  })
}
