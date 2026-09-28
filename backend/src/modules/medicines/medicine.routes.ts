import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { listMedicinesController } from './medicine.controller.js'
import { listMedicinesQuerySchema } from './medicine.schemas.js'

export const medicineRouter = Router()

medicineRouter.use(authenticate)

medicineRouter.get(
  '/',
  requirePermission(PERMISSIONS.medicineRead),
  validate({ query: listMedicinesQuerySchema }),
  listMedicinesController,
)
