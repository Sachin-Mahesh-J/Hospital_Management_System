import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  createEmployeeController,
  getEmployeeController,
  listEmployeesController,
  updateEmployeeController,
} from './employee.controller.js'
import {
  createEmployeeBodySchema,
  employeeIdParamsSchema,
  listEmployeesQuerySchema,
  updateEmployeeBodySchema,
} from './employee.schemas.js'

export const employeeRouter = Router()

employeeRouter.use(authenticate)

employeeRouter.get(
  '/',
  requirePermission(PERMISSIONS.employeeRead),
  validate({ query: listEmployeesQuerySchema }),
  listEmployeesController,
)
employeeRouter.post(
  '/',
  requirePermission(PERMISSIONS.employeeCreate),
  validate({ body: createEmployeeBodySchema }),
  createEmployeeController,
)
employeeRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.employeeRead),
  validate({ params: employeeIdParamsSchema }),
  getEmployeeController,
)
employeeRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.employeeUpdate),
  validate({
    params: employeeIdParamsSchema,
    body: updateEmployeeBodySchema,
  }),
  updateEmployeeController,
)
