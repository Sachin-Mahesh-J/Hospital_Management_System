import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  createDoctorController,
  createDoctorScheduleController,
  getDoctorController,
  listDoctorSchedulesController,
  listDoctorsController,
  updateDoctorController,
  updateDoctorScheduleController,
} from './doctor.controller.js'
import {
  createDoctorBodySchema,
  doctorIdParamsSchema,
  listDoctorsQuerySchema,
  updateDoctorBodySchema,
} from './doctor.schemas.js'
import {
  createScheduleBodySchema,
  listSchedulesQuerySchema,
  scheduleDoctorParamsSchema,
  scheduleParamsSchema,
  updateScheduleBodySchema,
} from './schedule.schemas.js'

export const doctorRouter = Router()

doctorRouter.use(authenticate)

doctorRouter.get(
  '/',
  requirePermission(PERMISSIONS.doctorRead),
  validate({ query: listDoctorsQuerySchema }),
  listDoctorsController,
)
doctorRouter.post(
  '/',
  requirePermission(PERMISSIONS.doctorCreate),
  validate({ body: createDoctorBodySchema }),
  createDoctorController,
)
doctorRouter.get(
  '/:doctorId/schedules',
  requirePermission(PERMISSIONS.doctorScheduleRead),
  validate({
    params: scheduleDoctorParamsSchema,
    query: listSchedulesQuerySchema,
  }),
  listDoctorSchedulesController,
)
doctorRouter.post(
  '/:doctorId/schedules',
  requirePermission(PERMISSIONS.doctorScheduleCreate),
  validate({
    params: scheduleDoctorParamsSchema,
    body: createScheduleBodySchema,
  }),
  createDoctorScheduleController,
)
doctorRouter.patch(
  '/:doctorId/schedules/:scheduleId',
  requirePermission(PERMISSIONS.doctorScheduleUpdate),
  validate({
    params: scheduleParamsSchema,
    body: updateScheduleBodySchema,
  }),
  updateDoctorScheduleController,
)
doctorRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.doctorRead),
  validate({ params: doctorIdParamsSchema }),
  getDoctorController,
)
doctorRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.doctorUpdate),
  validate({
    params: doctorIdParamsSchema,
    body: updateDoctorBodySchema,
  }),
  updateDoctorController,
)
