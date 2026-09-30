import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  createAttendanceController,
  getAttendanceController,
  listAttendanceController,
  updateAttendanceController,
} from './attendance.controller.js'
import {
  attendanceIdParamsSchema,
  createAttendanceBodySchema,
  listAttendanceQuerySchema,
  updateAttendanceBodySchema,
} from './attendance.schemas.js'

export const attendanceRouter = Router()

attendanceRouter.use(authenticate)

attendanceRouter.get(
  '/',
  requirePermission(PERMISSIONS.attendanceRead),
  validate({ query: listAttendanceQuerySchema }),
  listAttendanceController,
)
attendanceRouter.post(
  '/',
  requirePermission(PERMISSIONS.attendanceCreate),
  validate({ body: createAttendanceBodySchema }),
  createAttendanceController,
)
attendanceRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.attendanceRead),
  validate({ params: attendanceIdParamsSchema }),
  getAttendanceController,
)
attendanceRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.attendanceUpdate),
  validate({
    params: attendanceIdParamsSchema,
    body: updateAttendanceBodySchema,
  }),
  updateAttendanceController,
)
