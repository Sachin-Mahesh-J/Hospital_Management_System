export type CurrentUser = {
  id: string
  username: string
  roles: readonly string[]
  permissions: readonly string[]
}
