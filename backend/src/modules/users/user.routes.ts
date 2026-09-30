import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  changeUserRoleController,
  createUserController,
  deactivateUserController,
  getUserController,
  listUsersController,
  reactivateUserController,
  resetUserPasswordController,
  updateUserController,
} from './user.controller.js'
import {
  changeUserRoleBodySchema,
  createUserBodySchema,
  listUsersQuerySchema,
  resetUserPasswordBodySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './user.schemas.js'

export const userRouter = Router()

userRouter.use(authenticate)

userRouter.get(
  '/',
  requirePermission(PERMISSIONS.userRead),
  validate({ query: listUsersQuerySchema }),
  listUsersController,
)
userRouter.post(
  '/',
  requirePermission(PERMISSIONS.userCreate),
  validate({ body: createUserBodySchema }),
  createUserController,
)
userRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.userRead),
  validate({ params: userIdParamsSchema }),
  getUserController,
)
userRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.userUpdate),
  validate({
    params: userIdParamsSchema,
    body: updateUserBodySchema,
  }),
  updateUserController,
)
userRouter.post(
  '/:id/role',
  requirePermission(PERMISSIONS.userRoleUpdate),
  validate({
    params: userIdParamsSchema,
    body: changeUserRoleBodySchema,
  }),
  changeUserRoleController,
)
userRouter.post(
  '/:id/deactivate',
  requirePermission(PERMISSIONS.userDeactivate),
  validate({ params: userIdParamsSchema }),
  deactivateUserController,
)
userRouter.post(
  '/:id/reactivate',
  requirePermission(PERMISSIONS.userDeactivate),
  validate({ params: userIdParamsSchema }),
  reactivateUserController,
)
userRouter.post(
  '/:id/password-reset',
  requirePermission(PERMISSIONS.userPasswordReset),
  validate({
    params: userIdParamsSchema,
    body: resetUserPasswordBodySchema,
  }),
  resetUserPasswordController,
)
