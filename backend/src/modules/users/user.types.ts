export type ManagedUserDto = {
  id: string
  username: string
  status: string
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  role: {
    id: string
    code: string
    name: string
  }
  employee: {
    id: string
    employeeNumber: string
    firstName: string
    lastName: string
  } | null
}

export type ManagedUserRecord = {
  id: string
  username: string
  status: string
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  roles: Array<{
    role: { id: string; code: string; name: string }
  }>
  employee: {
    id: string
    employeeNumber: string
    firstName: string
    lastName: string
  } | null
}

export function toManagedUserDto(user: ManagedUserRecord): ManagedUserDto {
  const role = user.roles[0]?.role
  return {
    id: user.id,
    username: user.username,
    status: user.status,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    role: {
      id: role?.id ?? '',
      code: role?.code ?? '',
      name: role?.name ?? '',
    },
    employee: user.employee,
  }
}
