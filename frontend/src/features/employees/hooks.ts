import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { departmentKeys } from '../departments/hooks'
import {
  createEmployee,
  fetchEmployee,
  fetchEmployees,
  updateEmployee,
} from './api'
import type { EmployeeFilters, EmployeeInput, EmployeeUpdate } from './types'

export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: EmployeeFilters) =>
    [...employeeKeys.lists(), filters] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: string) => [...employeeKeys.details(), id] as const,
}

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: employeeKeys.list(filters),
    queryFn: () => fetchEmployees(filters),
    placeholderData: (previous) => previous,
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => fetchEmployee(id),
    enabled: Boolean(id),
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EmployeeInput) => createEmployee(input),
    onSuccess: async (employee) => {
      queryClient.setQueryData(employeeKeys.detail(employee.id), employee)
      await queryClient.invalidateQueries({ queryKey: employeeKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: departmentKeys.all })
    },
  })
}

export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EmployeeUpdate) => updateEmployee(id, input),
    onSuccess: async (employee) => {
      queryClient.setQueryData(employeeKeys.detail(id), employee)
      await queryClient.invalidateQueries({ queryKey: employeeKeys.lists() })
      await queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) })
      await queryClient.invalidateQueries({ queryKey: ['doctors'] })
    },
  })
}
