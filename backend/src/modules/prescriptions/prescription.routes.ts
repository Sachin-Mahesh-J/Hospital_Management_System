import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  cancelPrescriptionController,
  createPrescriptionController,
  getPrescriptionController,
  listPrescriptionsController,
} from './prescription.controller.js'
import {
  cancelPrescriptionBodySchema,
  createPrescriptionBodySchema,
  listPrescriptionsQuerySchema,
  prescriptionIdParamsSchema,
} from './prescription.schemas.js'

export const prescriptionRouter = Router()

prescriptionRouter.use(authenticate)

prescriptionRouter.get(
  '/',
  requirePermission(PERMISSIONS.prescriptionRead),
  validate({ query: listPrescriptionsQuerySchema }),
  listPrescriptionsController,
)
prescriptionRouter.post(
  '/',
  requirePermission(PERMISSIONS.prescriptionCreate),
  validate({ body: createPrescriptionBodySchema }),
  createPrescriptionController,
)
prescriptionRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.prescriptionRead),
  validate({ params: prescriptionIdParamsSchema }),
  getPrescriptionController,
)
prescriptionRouter.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS.prescriptionCancel),
  validate({
    params: prescriptionIdParamsSchema,
    body: cancelPrescriptionBodySchema,
  }),
  cancelPrescriptionController,
)
