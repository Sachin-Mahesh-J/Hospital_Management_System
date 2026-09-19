import type { CurrentUser } from '../api/auth'

export function hasPermission(
  user: CurrentUser | null,
  permission: string,
): boolean {
  return user?.permissions.includes(permission) ?? false
}
