import {
  apiClient,
  refreshSession,
  setAccessToken,
} from './client'

export type CurrentUser = {
  id: string
  username: string
  roles: string[]
  permissions: string[]
}

type AccessTokenResponse = {
  accessToken: string
}

export async function login(
  username: string,
  password: string,
): Promise<void> {
  const response = await apiClient.post<AccessTokenResponse>('/auth/login', {
    username,
    password,
  })
  setAccessToken(response.accessToken)
}

export function refresh(): Promise<string> {
  return refreshSession()
}

export function getCurrentUser(): Promise<CurrentUser> {
  return apiClient.get<CurrentUser>('/auth/me')
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post<void>('/auth/logout')
  } finally {
    setAccessToken(null)
  }
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return apiClient.post<void>('/auth/change-password', {
    currentPassword,
    newPassword,
  })
}
