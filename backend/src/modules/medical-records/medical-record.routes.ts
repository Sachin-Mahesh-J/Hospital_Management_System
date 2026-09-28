import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  amendMedicalRecordController,
  createMedicalRecordController,
  finalizeMedicalRecordController,
  getMedicalRecordController,
  listMedicalRecordsController,
  updateMedicalRecordController,
} from './medical-record.controller.js'
import {
  amendMedicalRecordBodySchema,
  createMedicalRecordBodySchema,
  listMedicalRecordsQuerySchema,
  medicalRecordIdParamsSchema,
  updateMedicalRecordBodySchema,
} from './medical-record.schemas.js'

export const medicalRecordRouter = Router()

medicalRecordRouter.use(authenticate)

medicalRecordRouter.get(
  '/',
  requirePermission(PERMISSIONS.medicalRecordRead),
  validate({ query: listMedicalRecordsQuerySchema }),
  listMedicalRecordsController,
)
medicalRecordRouter.post(
  '/',
  requirePermission(PERMISSIONS.medicalRecordCreate),
  validate({ body: createMedicalRecordBodySchema }),
  createMedicalRecordController,
)
medicalRecordRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.medicalRecordRead),
  validate({ params: medicalRecordIdParamsSchema }),
  getMedicalRecordController,
)
medicalRecordRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.medicalRecordUpdate),
  validate({
    params: medicalRecordIdParamsSchema,
    body: updateMedicalRecordBodySchema,
  }),
  updateMedicalRecordController,
)
medicalRecordRouter.post(
  '/:id/finalize',
  requirePermission(PERMISSIONS.medicalRecordFinalize),
  validate({ params: medicalRecordIdParamsSchema }),
  finalizeMedicalRecordController,
)
medicalRecordRouter.post(
  '/:id/amend',
  requirePermission(PERMISSIONS.medicalRecordAmend),
  validate({
    params: medicalRecordIdParamsSchema,
    body: amendMedicalRecordBodySchema,
  }),
  amendMedicalRecordController,
)
