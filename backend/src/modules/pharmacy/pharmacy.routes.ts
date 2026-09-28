import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  adjustStockController,
  listInventoryController,
  listMovementsController,
  receiveStockController,
} from './pharmacy.controller.js'
import {
  adjustStockBodySchema,
  listInventoryQuerySchema,
  listMovementsQuerySchema,
  receiveStockBodySchema,
} from './pharmacy.schemas.js'

export const pharmacyRouter = Router()

pharmacyRouter.use(authenticate)

pharmacyRouter.get(
  '/inventory',
  requirePermission(PERMISSIONS.inventoryRead),
  validate({ query: listInventoryQuerySchema }),
  listInventoryController,
)
pharmacyRouter.get(
  '/movements',
  requirePermission(PERMISSIONS.stockMovementRead),
  validate({ query: listMovementsQuerySchema }),
  listMovementsController,
)
pharmacyRouter.post(
  '/receipts',
  requirePermission(PERMISSIONS.stockReceive),
  validate({ body: receiveStockBodySchema }),
  receiveStockController,
)
pharmacyRouter.post(
  '/adjustments',
  requirePermission(PERMISSIONS.stockAdjust),
  validate({ body: adjustStockBodySchema }),
  adjustStockController,
)
