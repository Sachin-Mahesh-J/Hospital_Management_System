import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  collectLabSampleController,
  createLabRequestController,
  enterLabResultController,
  getLabRequestController,
  listLabRequestsController,
  listLabTestsController,
} from './laboratory.controller.js'
import {
  collectSampleBodySchema,
  createLabRequestBodySchema,
  enterLabResultBodySchema,
  labRequestIdParamsSchema,
  labRequestItemParamsSchema,
  listLabRequestsQuerySchema,
  listLabTestsQuerySchema,
} from './laboratory.schemas.js'

export const laboratoryRouter = Router()

laboratoryRouter.use(authenticate)

laboratoryRouter.get(
  '/tests',
  requirePermission(PERMISSIONS.labTestRead),
  validate({ query: listLabTestsQuerySchema }),
  listLabTestsController,
)
laboratoryRouter.get(
  '/requests',
  requirePermission(PERMISSIONS.labRequestRead),
  validate({ query: listLabRequestsQuerySchema }),
  listLabRequestsController,
)
laboratoryRouter.post(
  '/requests',
  requirePermission(PERMISSIONS.labRequestCreate),
  validate({ body: createLabRequestBodySchema }),
  createLabRequestController,
)
laboratoryRouter.get(
  '/requests/:id',
  requirePermission(PERMISSIONS.labRequestRead),
  validate({ params: labRequestIdParamsSchema }),
  getLabRequestController,
)
laboratoryRouter.post(
  '/requests/:id/items/:itemId/sample',
  requirePermission(PERMISSIONS.labSampleCollect),
  validate({
    params: labRequestItemParamsSchema,
    body: collectSampleBodySchema,
  }),
  collectLabSampleController,
)
laboratoryRouter.post(
  '/requests/:id/items/:itemId/results',
  requirePermission(PERMISSIONS.labResultEnter),
  validate({
    params: labRequestItemParamsSchema,
    body: enterLabResultBodySchema,
  }),
  enterLabResultController,
)
