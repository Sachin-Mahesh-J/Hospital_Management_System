import type { RequestHandler } from 'express'
import { sendPaginated, sendSuccess } from '../../api/response.js'
import {
  getAppointmentReport,
  getDashboard,
  getLaboratoryReport,
  getPatientReport,
  getPharmacyReport,
  getRevenueReport,
  getStaffReport,
} from './report.service.js'
import {
  listAppointmentReportQuerySchema,
  listLaboratoryReportQuerySchema,
  listPatientReportQuerySchema,
  listPharmacyReportQuerySchema,
  listRevenueReportQuerySchema,
  listStaffReportQuerySchema,
} from './report.schemas.js'

export const listPatientReportController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getPatientReport(
      listPatientReportQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const listAppointmentReportController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getAppointmentReport(
      listAppointmentReportQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const listRevenueReportController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getRevenueReport(
      listRevenueReportQuerySchema.parse(request.query),
    )
    response.status(200).json({
      data: result.data,
      meta: {
        pagination: result.pagination,
        summary: result.summary,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const listPharmacyReportController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getPharmacyReport(
      listPharmacyReportQuerySchema.parse(request.query),
    )
    response.status(200).json({
      data: result.data,
      meta: {
        pagination: result.pagination,
        summary: result.summary,
        section: result.section,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const listLaboratoryReportController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getLaboratoryReport(
      listLaboratoryReportQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const listStaffReportController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getStaffReport(
      listStaffReportQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const getDashboardController: RequestHandler = async (
  _request,
  response,
  next,
) => {
  try {
    sendSuccess(response, await getDashboard(response.locals.currentUser!))
  } catch (error) {
    next(error)
  }
}
