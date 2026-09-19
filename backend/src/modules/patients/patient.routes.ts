import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  createPatientController,
  getPatientController,
  listPatientsController,
  updatePatientController,
} from './patient.controller.js'
import {
  createPatientBodySchema,
  listPatientsQuerySchema,
  patientIdParamsSchema,
  updatePatientBodySchema,
} from './patient.schemas.js'

export const patientRouter = Router()

patientRouter.use(authenticate)

patientRouter.get(
  '/',
  requirePermission(PERMISSIONS.patientRead),
  validate({ query: listPatientsQuerySchema }),
  listPatientsController,
)
patientRouter.post(
  '/',
  requirePermission(PERMISSIONS.patientCreate),
  validate({ body: createPatientBodySchema }),
  createPatientController,
)
patientRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.patientRead),
  validate({ params: patientIdParamsSchema }),
  getPatientController,
)
patientRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.patientUpdate),
  validate({
    params: patientIdParamsSchema,
    body: updatePatientBodySchema,
  }),
  updatePatientController,
)
