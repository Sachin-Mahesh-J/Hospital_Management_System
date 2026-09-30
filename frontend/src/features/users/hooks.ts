import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  changeUserRole,
  createUser,
  deactivateUser,
  fetchUsers,
  reactivateUser,
  resetUserPassword,
  updateUser,
} from './api'
import type { CreateUserInput, UpdateUserInput, UserFilters } from './types'

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
}

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsers(filters),
    placeholderData: (previous) => previous,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      updateUser(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useChangeUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, roleCode }: { id: string; roleCode: string }) =>
      changeUserRole(id, roleCode),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useReactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reactivateUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      resetUserPassword(id, newPassword),
  })
}
