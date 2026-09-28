import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  collectLabSample,
  createLabRequest,
  enterLabResult,
  fetchLabRequest,
  fetchLabRequests,
  fetchLabTests,
} from './api'
import type {
  LabRequestFilters,
  LabRequestInput,
  LabResultInput,
  LabTestFilters,
} from './types'

export const laboratoryKeys = {
  all: ['laboratory'] as const,
  tests: (filters: LabTestFilters) =>
    [...laboratoryKeys.all, 'tests', filters] as const,
  lists: () => [...laboratoryKeys.all, 'requests'] as const,
  list: (filters: LabRequestFilters) =>
    [...laboratoryKeys.lists(), filters] as const,
  details: () => [...laboratoryKeys.all, 'request'] as const,
  detail: (id: string) => [...laboratoryKeys.details(), id] as const,
}

export function useLabTests(filters: LabTestFilters, enabled = true) {
  return useQuery({
    queryKey: laboratoryKeys.tests(filters),
    queryFn: () => fetchLabTests(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useLabRequests(filters: LabRequestFilters, enabled = true) {
  return useQuery({
    queryKey: laboratoryKeys.list(filters),
    queryFn: () => fetchLabRequests(filters),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useLabRequest(id: string) {
  return useQuery({
    queryKey: laboratoryKeys.detail(id),
    queryFn: () => fetchLabRequest(id),
    enabled: Boolean(id),
  })
}

async function invalidateLaboratoryQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  ...ids: string[]
) {
  await queryClient.invalidateQueries({ queryKey: laboratoryKeys.lists() })
  for (const id of ids) {
    if (id) {
      await queryClient.invalidateQueries({ queryKey: laboratoryKeys.detail(id) })
    }
  }
}

export function useCreateLabRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LabRequestInput) => createLabRequest(input),
    onSuccess: async (request) => {
      queryClient.setQueryData(laboratoryKeys.detail(request.id), request)
      await invalidateLaboratoryQueries(queryClient, request.id)
    },
  })
}

export function useCollectLabSample(requestId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => collectLabSample(requestId, itemId),
    onSuccess: async (request) => {
      queryClient.setQueryData(laboratoryKeys.detail(requestId), request)
      await invalidateLaboratoryQueries(queryClient, requestId)
    },
  })
}

export function useEnterLabResult(requestId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: LabResultInput }) =>
      enterLabResult(requestId, itemId, input),
    onSuccess: async (request) => {
      queryClient.setQueryData(laboratoryKeys.detail(requestId), request)
      await invalidateLaboratoryQueries(queryClient, requestId)
    },
  })
}
