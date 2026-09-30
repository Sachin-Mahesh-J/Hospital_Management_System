import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  createMedicineController,
  deactivateMedicineController,
  getMedicineController,
  listMedicinesController,
  reactivateMedicineController,
  updateMedicineController,
} from './medicine.controller.js'
import {
  createMedicineBodySchema,
  listMedicinesQuerySchema,
  medicineIdParamsSchema,
  updateMedicineBodySchema,
} from './medicine.schemas.js'

export const medicineRouter = Router()

medicineRouter.use(authenticate)

medicineRouter.get(
  '/',
  requirePermission(PERMISSIONS.medicineRead),
  validate({ query: listMedicinesQuerySchema }),
  listMedicinesController,
)
medicineRouter.post(
  '/',
  requirePermission(PERMISSIONS.medicineCreate),
  validate({ body: createMedicineBodySchema }),
  createMedicineController,
)
medicineRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.medicineRead),
  validate({ params: medicineIdParamsSchema }),
  getMedicineController,
)
medicineRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.medicineUpdate),
  validate({
    params: medicineIdParamsSchema,
    body: updateMedicineBodySchema,
  }),
  updateMedicineController,
)
medicineRouter.post(
  '/:id/deactivate',
  requirePermission(PERMISSIONS.medicineDeactivate),
  validate({ params: medicineIdParamsSchema }),
  deactivateMedicineController,
)
medicineRouter.post(
  '/:id/reactivate',
  requirePermission(PERMISSIONS.medicineReactivate),
  validate({ params: medicineIdParamsSchema }),
  reactivateMedicineController,
)
