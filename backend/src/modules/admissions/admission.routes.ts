import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  cancelAdmissionController,
  createAdmissionController,
  dischargeAdmissionController,
  getAdmissionController,
  listAdmissionsController,
  updateAdmissionController,
} from './admission.controller.js'
import {
  admissionIdParamsSchema,
  cancelAdmissionBodySchema,
  createAdmissionBodySchema,
  dischargeAdmissionBodySchema,
  listAdmissionsQuerySchema,
  updateAdmissionBodySchema,
} from './admission.schemas.js'

export const admissionRouter = Router()

admissionRouter.use(authenticate)

admissionRouter.get(
  '/',
  requirePermission(PERMISSIONS.admissionRead),
  validate({ query: listAdmissionsQuerySchema }),
  listAdmissionsController,
)
admissionRouter.post(
  '/',
  requirePermission(PERMISSIONS.admissionCreate),
  validate({ body: createAdmissionBodySchema }),
  createAdmissionController,
)
admissionRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.admissionRead),
  validate({ params: admissionIdParamsSchema }),
  getAdmissionController,
)
admissionRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.admissionUpdate),
  validate({
    params: admissionIdParamsSchema,
    body: updateAdmissionBodySchema,
  }),
  updateAdmissionController,
)
admissionRouter.post(
  '/:id/discharge',
  requirePermission(PERMISSIONS.admissionDischarge),
  validate({
    params: admissionIdParamsSchema,
    body: dischargeAdmissionBodySchema,
  }),
  dischargeAdmissionController,
)
admissionRouter.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS.admissionCancel),
  validate({
    params: admissionIdParamsSchema,
    body: cancelAdmissionBodySchema,
  }),
  cancelAdmissionController,
)
