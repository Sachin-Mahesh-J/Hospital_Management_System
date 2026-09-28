import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createDepartment,
  fetchDepartment,
  fetchDepartments,
  updateDepartment,
} from './api'
import type {
  DepartmentFilters,
  DepartmentInput,
  DepartmentUpdate,
} from './types'

export const departmentKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentKeys.all, 'list'] as const,
  list: (filters: DepartmentFilters) =>
    [...departmentKeys.lists(), filters] as const,
  details: () => [...departmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...departmentKeys.details(), id] as const,
}

export function useDepartments(
  filters: DepartmentFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: departmentKeys.list(filters),
    queryFn: () => fetchDepartments(filters),
    placeholderData: (previous) => previous,
    enabled: options?.enabled ?? true,
  })
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: departmentKeys.detail(id),
    queryFn: () => fetchDepartment(id),
    enabled: Boolean(id),
  })
}

export function useCreateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DepartmentInput) => createDepartment(input),
    onSuccess: async (department) => {
      queryClient.setQueryData(departmentKeys.detail(department.id), department)
      await queryClient.invalidateQueries({ queryKey: departmentKeys.lists() })
    },
  })
}

export function useUpdateDepartment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DepartmentUpdate) => updateDepartment(id, input),
    onSuccess: async (department) => {
      queryClient.setQueryData(departmentKeys.detail(id), department)
      await queryClient.invalidateQueries({ queryKey: departmentKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: departmentKeys.detail(id) })
    },
  })
}
