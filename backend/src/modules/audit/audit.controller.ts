import type { RequestHandler } from 'express'
import { sendPaginated } from '../../api/response.js'
import { exportAuditQuerySchema, listAuditQuerySchema } from './audit.schemas.js'
import { exportAuditRecords, getAuditRecords } from './audit.service.js'

export const listAuditController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await getAuditRecords(
      listAuditQuerySchema.parse(request.query),
    )
    sendPaginated(response, result.data, result.pagination)
  } catch (error) {
    next(error)
  }
}

export const exportAuditController: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const exported = await exportAuditRecords(
      exportAuditQuerySchema.parse(request.query),
      {
        actorUserId: response.locals.currentUser!.id,
        requestId: response.locals.requestId,
      },
    )
    response.setHeader('Content-Type', exported.contentType)
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.filename}"`,
    )
    response.setHeader('Cache-Control', 'no-store')
    response.status(200).send(exported.body)
  } catch (error) {
    next(error)
  }
}
