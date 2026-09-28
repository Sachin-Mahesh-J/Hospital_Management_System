import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  createDepartmentController,
  getDepartmentController,
  listDepartmentsController,
  updateDepartmentController,
} from './department.controller.js'
import {
  createDepartmentBodySchema,
  departmentIdParamsSchema,
  listDepartmentsQuerySchema,
  updateDepartmentBodySchema,
} from './department.schemas.js'

export const departmentRouter = Router()

departmentRouter.use(authenticate)

departmentRouter.get(
  '/',
  requirePermission(PERMISSIONS.departmentRead),
  validate({ query: listDepartmentsQuerySchema }),
  listDepartmentsController,
)
departmentRouter.post(
  '/',
  requirePermission(PERMISSIONS.departmentCreate),
  validate({ body: createDepartmentBodySchema }),
  createDepartmentController,
)
departmentRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.departmentRead),
  validate({ params: departmentIdParamsSchema }),
  getDepartmentController,
)
departmentRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.departmentUpdate),
  validate({
    params: departmentIdParamsSchema,
    body: updateDepartmentBodySchema,
  }),
  updateDepartmentController,
)
