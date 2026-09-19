import type { CurrentUser } from '../auth/currentUser.js'

declare global {
  namespace Express {
    interface Locals {
      currentUser?: CurrentUser
      requestId: string
    }
  }
}

export {}
