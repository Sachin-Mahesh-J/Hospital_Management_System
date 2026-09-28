import { Router } from 'express'
import { PERMISSIONS } from '../../auth/auth.constants.js'
import { requirePermission } from '../../middleware/accessControl.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  createInvoiceController,
  createInvoicePaymentController,
  getInvoiceController,
  issueInvoiceController,
  listBillingPatientsController,
  listConsultationSourcesController,
  listInvoicePaymentsController,
  listInvoicesController,
  listLaboratorySourcesController,
  listPharmacySourcesController,
  reversePaymentController,
  updateInvoiceController,
  voidInvoiceController,
} from './billing.controller.js'
import {
  billingPatientIdParamsSchema,
  createInvoiceBodySchema,
  createPaymentBodySchema,
  invoiceIdParamsSchema,
  listBillingPatientsQuerySchema,
  listInvoicesQuerySchema,
  paymentIdParamsSchema,
  reversePaymentBodySchema,
  updateInvoiceBodySchema,
  voidInvoiceBodySchema,
} from './billing.schemas.js'

export const invoiceRouter = Router()
export const paymentRouter = Router()
export const billingLookupRouter = Router()

invoiceRouter.use(authenticate)
paymentRouter.use(authenticate)
billingLookupRouter.use(authenticate)

invoiceRouter.get(
  '/',
  requirePermission(PERMISSIONS.invoiceRead),
  validate({ query: listInvoicesQuerySchema }),
  listInvoicesController,
)
invoiceRouter.post(
  '/',
  requirePermission(PERMISSIONS.invoiceCreate),
  validate({ body: createInvoiceBodySchema }),
  createInvoiceController,
)
invoiceRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.invoiceRead),
  validate({ params: invoiceIdParamsSchema }),
  getInvoiceController,
)
invoiceRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.invoiceUpdate),
  validate({ params: invoiceIdParamsSchema, body: updateInvoiceBodySchema }),
  updateInvoiceController,
)
invoiceRouter.post(
  '/:id/issue',
  requirePermission(PERMISSIONS.invoiceIssue),
  validate({ params: invoiceIdParamsSchema }),
  issueInvoiceController,
)
invoiceRouter.post(
  '/:id/void',
  requirePermission(PERMISSIONS.invoiceVoid),
  validate({ params: invoiceIdParamsSchema, body: voidInvoiceBodySchema }),
  voidInvoiceController,
)
invoiceRouter.get(
  '/:id/payments',
  requirePermission(PERMISSIONS.paymentRead),
  validate({ params: invoiceIdParamsSchema }),
  listInvoicePaymentsController,
)
invoiceRouter.post(
  '/:id/payments',
  requirePermission(PERMISSIONS.paymentCreate),
  validate({ params: invoiceIdParamsSchema, body: createPaymentBodySchema }),
  createInvoicePaymentController,
)

paymentRouter.post(
  '/:id/reverse',
  requirePermission(PERMISSIONS.paymentReverse),
  validate({ params: paymentIdParamsSchema, body: reversePaymentBodySchema }),
  reversePaymentController,
)

billingLookupRouter.get(
  '/patients',
  requirePermission(PERMISSIONS.invoiceRead),
  validate({ query: listBillingPatientsQuerySchema }),
  listBillingPatientsController,
)
billingLookupRouter.get(
  '/patients/:patientId/consultations',
  requirePermission(PERMISSIONS.invoiceRead),
  validate({ params: billingPatientIdParamsSchema }),
  listConsultationSourcesController,
)
billingLookupRouter.get(
  '/patients/:patientId/laboratory-items',
  requirePermission(PERMISSIONS.invoiceRead),
  validate({ params: billingPatientIdParamsSchema }),
  listLaboratorySourcesController,
)
billingLookupRouter.get(
  '/patients/:patientId/dispenses',
  requirePermission(PERMISSIONS.invoiceRead),
  validate({ params: billingPatientIdParamsSchema }),
  listPharmacySourcesController,
)
