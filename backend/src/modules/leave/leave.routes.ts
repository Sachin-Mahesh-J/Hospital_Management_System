import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  approveLeaveController,
  cancelLeaveController,
  createLeaveController,
  getLeaveController,
  listLeaveController,
  rejectLeaveController,
  updateLeaveController,
} from './leave.controller.js'
import {
  createLeaveBodySchema,
  decideLeaveBodySchema,
  leaveIdParamsSchema,
  listLeaveQuerySchema,
  updateLeaveBodySchema,
} from './leave.schemas.js'

export const leaveRouter = Router()

leaveRouter.use(authenticate)

leaveRouter.get(
  '/',
  requirePermission(PERMISSIONS.leaveRead),
  validate({ query: listLeaveQuerySchema }),
  listLeaveController,
)
leaveRouter.post(
  '/',
  requirePermission(PERMISSIONS.leaveCreate),
  validate({ body: createLeaveBodySchema }),
  createLeaveController,
)
leaveRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.leaveRead),
  validate({ params: leaveIdParamsSchema }),
  getLeaveController,
)
leaveRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.leaveUpdate),
  validate({
    params: leaveIdParamsSchema,
    body: updateLeaveBodySchema,
  }),
  updateLeaveController,
)
leaveRouter.post(
  '/:id/approve',
  requirePermission(PERMISSIONS.leaveApprove),
  validate({
    params: leaveIdParamsSchema,
    body: decideLeaveBodySchema,
  }),
  approveLeaveController,
)
leaveRouter.post(
  '/:id/reject',
  requirePermission(PERMISSIONS.leaveApprove),
  validate({
    params: leaveIdParamsSchema,
    body: decideLeaveBodySchema,
  }),
  rejectLeaveController,
)
leaveRouter.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS.leaveCancel),
  validate({ params: leaveIdParamsSchema }),
  cancelLeaveController,
)
