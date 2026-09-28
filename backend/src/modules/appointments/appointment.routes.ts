import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  cancelAppointmentController,
  createAppointmentController,
  getAppointmentController,
  listAppointmentsController,
  rescheduleAppointmentController,
  updateAppointmentController,
  updateAppointmentStatusController,
} from './appointment.controller.js'
import {
  appointmentIdParamsSchema,
  cancelAppointmentBodySchema,
  createAppointmentBodySchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentBodySchema,
  updateAppointmentBodySchema,
  updateAppointmentStatusBodySchema,
} from './appointment.schemas.js'

export const appointmentRouter = Router()

appointmentRouter.use(authenticate)

appointmentRouter.get(
  '/',
  requirePermission(PERMISSIONS.appointmentRead),
  validate({ query: listAppointmentsQuerySchema }),
  listAppointmentsController,
)
appointmentRouter.post(
  '/',
  requirePermission(PERMISSIONS.appointmentCreate),
  validate({ body: createAppointmentBodySchema }),
  createAppointmentController,
)
appointmentRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.appointmentRead),
  validate({ params: appointmentIdParamsSchema }),
  getAppointmentController,
)
appointmentRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.appointmentUpdate),
  validate({
    params: appointmentIdParamsSchema,
    body: updateAppointmentBodySchema,
  }),
  updateAppointmentController,
)
appointmentRouter.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS.appointmentCancel),
  validate({
    params: appointmentIdParamsSchema,
    body: cancelAppointmentBodySchema,
  }),
  cancelAppointmentController,
)
appointmentRouter.post(
  '/:id/reschedule',
  requirePermission(PERMISSIONS.appointmentReschedule),
  validate({
    params: appointmentIdParamsSchema,
    body: rescheduleAppointmentBodySchema,
  }),
  rescheduleAppointmentController,
)
appointmentRouter.patch(
  '/:id/status',
  requirePermission(PERMISSIONS.appointmentStatusUpdate),
  validate({
    params: appointmentIdParamsSchema,
    body: updateAppointmentStatusBodySchema,
  }),
  updateAppointmentStatusController,
)
