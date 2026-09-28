import type { CurrentUser } from '../api/auth'

export function hasPermission(
  user: CurrentUser | null,
  permission: string,
): boolean {
  return user?.permissions.includes(permission) ?? false
}

export function hasAnyPermission(
  user: CurrentUser | null,
  permissions: readonly string[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission))
}
