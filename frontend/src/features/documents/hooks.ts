import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  accessDocument,
  deleteDocument,
  fetchDocuments,
  updateDocument,
  uploadDocument,
} from './api'
import type { DocumentFilters, DocumentMetadataUpdate } from './types'

export const documentKeys = {
  all: ['patient-documents'] as const,
  lists: (patientId: string) => [...documentKeys.all, patientId, 'list'] as const,
  list: (patientId: string, filters: DocumentFilters) =>
    [...documentKeys.lists(patientId), filters] as const,
}

export function useDocuments(patientId: string, filters: DocumentFilters) {
  return useQuery({
    queryKey: documentKeys.list(patientId, filters),
    queryFn: () => fetchDocuments(patientId, filters),
    enabled: Boolean(patientId),
    placeholderData: (previous) => previous,
  })
}

export function useUploadDocument(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (form: FormData) => uploadDocument(patientId, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: documentKeys.lists(patientId) })
    },
  })
}

export function useUpdateDocument(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      documentId,
      input,
    }: {
      documentId: string
      input: DocumentMetadataUpdate
    }) => updateDocument(patientId, documentId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: documentKeys.lists(patientId) })
    },
  })
}

export function useDeleteDocument(patientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(patientId, documentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: documentKeys.lists(patientId) })
    },
  })
}

export function useAccessDocument(patientId: string) {
  return useMutation({
    mutationFn: (documentId: string) => accessDocument(patientId, documentId),
  })
}
