import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  exportAuditController,
  listAuditController,
} from './audit.controller.js'
import {
  exportAuditQuerySchema,
  listAuditQuerySchema,
} from './audit.schemas.js'

export const auditRouter = Router()

auditRouter.use(authenticate)

auditRouter.get(
  '/',
  requirePermission(PERMISSIONS.auditRead),
  validate({ query: listAuditQuerySchema }),
  listAuditController,
)
auditRouter.get(
  '/export',
  requirePermission(PERMISSIONS.auditRead),
  validate({ query: exportAuditQuerySchema }),
  exportAuditController,
)
