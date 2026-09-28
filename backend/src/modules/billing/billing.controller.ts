import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
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
import {
  createDraftInvoice,
  createInvoicePayment,
  getBillingPatients,
  getConsultationSources,
  getInvoice,
  getInvoicePayments,
  getInvoices,
  getLaboratorySources,
  getPharmacySources,
  issueInvoice,
  reversePayment,
  updateDraftInvoice,
  voidInvoice,
} from './billing.service.js'

function mutationContext(response: Parameters<RequestHandler>[1]) {
  return {
    actorUserId: response.locals.currentUser!.id,
    requestId: response.locals.requestId,
  }
}

export const listInvoicesController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getInvoices(listInvoicesQuerySchema.parse(request.query))
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getInvoiceController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = invoiceIdParamsSchema.parse(request.params)
    sendSuccess(response, await getInvoice(id))
  } catch (error) {
    next(error)
  }
}

export const createInvoiceController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const invoice = await createDraftInvoice(
      createInvoiceBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, invoice, 201)
  } catch (error) {
    next(error)
  }
}

export const updateInvoiceController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = invoiceIdParamsSchema.parse(request.params)
    const invoice = await updateDraftInvoice(
      id,
      updateInvoiceBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, invoice)
  } catch (error) {
    next(error)
  }
}

export const issueInvoiceController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = invoiceIdParamsSchema.parse(request.params)
    sendSuccess(response, await issueInvoice(id, mutationContext(response)))
  } catch (error) {
    next(error)
  }
}

export const voidInvoiceController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = invoiceIdParamsSchema.parse(request.params)
    sendSuccess(
      response,
      await voidInvoice(
        id,
        voidInvoiceBodySchema.parse(request.body),
        mutationContext(response),
      ),
    )
  } catch (error) {
    next(error)
  }
}

export const listInvoicePaymentsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = invoiceIdParamsSchema.parse(request.params)
    sendSuccess(response, await getInvoicePayments(id))
  } catch (error) {
    next(error)
  }
}

export const createInvoicePaymentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = invoiceIdParamsSchema.parse(request.params)
    const payment = await createInvoicePayment(
      id,
      createPaymentBodySchema.parse(request.body),
      mutationContext(response),
    )
    sendSuccess(response, payment, 201)
  } catch (error) {
    next(error)
  }
}

export const reversePaymentController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { id } = paymentIdParamsSchema.parse(request.params)
    sendSuccess(
      response,
      await reversePayment(
        id,
        reversePaymentBodySchema.parse(request.body),
        mutationContext(response),
      ),
      201,
    )
  } catch (error) {
    next(error)
  }
}

export const listBillingPatientsController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getBillingPatients(
      listBillingPatientsQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const listConsultationSourcesController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { patientId } = billingPatientIdParamsSchema.parse(request.params)
    sendSuccess(response, await getConsultationSources(patientId))
  } catch (error) {
    next(error)
  }
}

export const listLaboratorySourcesController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { patientId } = billingPatientIdParamsSchema.parse(request.params)
    sendSuccess(response, await getLaboratorySources(patientId))
  } catch (error) {
    next(error)
  }
}

export const listPharmacySourcesController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const { patientId } = billingPatientIdParamsSchema.parse(request.params)
    sendSuccess(response, await getPharmacySources(patientId))
  } catch (error) {
    next(error)
  }
}
