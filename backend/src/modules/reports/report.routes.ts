import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  getDashboardController,
  listAppointmentReportController,
  listLaboratoryReportController,
  listPatientReportController,
  listPharmacyReportController,
  listRevenueReportController,
  listStaffReportController,
} from './report.controller.js'
import {
  dashboardQuerySchema,
  listAppointmentReportQuerySchema,
  listLaboratoryReportQuerySchema,
  listPatientReportQuerySchema,
  listPharmacyReportQuerySchema,
  listRevenueReportQuerySchema,
  listStaffReportQuerySchema,
} from './report.schemas.js'

export const reportRouter = Router()
reportRouter.use(authenticate)

reportRouter.get(
  '/patients',
  requirePermission(PERMISSIONS.reportPatientRead),
  validate({ query: listPatientReportQuerySchema }),
  listPatientReportController,
)
reportRouter.get(
  '/appointments',
  requirePermission(PERMISSIONS.reportAppointmentRead),
  validate({ query: listAppointmentReportQuerySchema }),
  listAppointmentReportController,
)
reportRouter.get(
  '/revenue',
  requirePermission(PERMISSIONS.reportRevenueRead),
  validate({ query: listRevenueReportQuerySchema }),
  listRevenueReportController,
)
reportRouter.get(
  '/pharmacy',
  requirePermission(PERMISSIONS.reportPharmacyRead),
  validate({ query: listPharmacyReportQuerySchema }),
  listPharmacyReportController,
)
reportRouter.get(
  '/laboratory',
  requirePermission(PERMISSIONS.reportLaboratoryRead),
  validate({ query: listLaboratoryReportQuerySchema }),
  listLaboratoryReportController,
)
reportRouter.get(
  '/staff',
  requirePermission(PERMISSIONS.reportStaffRead),
  validate({ query: listStaffReportQuerySchema }),
  listStaffReportController,
)

export const dashboardRouter = Router()
dashboardRouter.get(
  '/',
  authenticate,
  validate({ query: dashboardQuerySchema }),
  getDashboardController,
)
