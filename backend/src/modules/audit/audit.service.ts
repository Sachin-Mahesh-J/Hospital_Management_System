import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import { AppError } from '../../errors/AppError.js'
import { buildAuditCsv, buildAuditPdf } from './audit.export.js'
import {
  MAX_EXPORT_ROWS,
  listAuditRecords,
  listAuditRecordsForExport,
} from './audit.repository.js'
import type { ExportAuditQuery, ListAuditQuery } from './audit.schemas.js'
import type { SafeAuditDto } from './audit.sanitize.js'

export type AuditEvent = {
  actorUserId?: string | null
  action: string
  resourceType: string
  resourceId?: string | null
  outcome: 'success' | 'failure' | 'denied'
  requestId?: string | null
  metadata?: Prisma.InputJsonObject
}

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'>

export function writeAudit(
  event: AuditEvent,
  client: AuditClient = database.client,
) {
  return client.auditLog.create({
    data: {
      actorUserId: event.actorUserId ?? null,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId ?? null,
      outcome: event.outcome,
      requestId: event.requestId ?? null,
      metadata: event.metadata ?? {},
    },
  })
}

export async function getAuditRecords(query: ListAuditQuery): Promise<{
  data: SafeAuditDto[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}> {
  const result = await listAuditRecords(query)
  return {
    data: result.records,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: result.totalItems,
      totalPages: Math.ceil(result.totalItems / query.pageSize),
    },
  }
}

export async function exportAuditRecords(
  query: ExportAuditQuery,
  context: { actorUserId: string; requestId: string },
): Promise<{
  body: Buffer
  contentType: string
  filename: string
}> {
  const rows = await listAuditRecordsForExport(query)
  if (rows.length > MAX_EXPORT_ROWS) {
    throw new AppError(
      400,
      'AUDIT_EXPORT_TOO_LARGE',
      'Audit export exceeds the maximum allowed number of records. Narrow the date range or filters and try again.',
    )
  }
  const body =
    query.format === 'csv'
      ? Buffer.from(buildAuditCsv(rows), 'utf8')
      : await buildAuditPdf(rows)
  await writeAudit({
    actorUserId: context.actorUserId,
    action: 'audit.export',
    resourceType: 'audit',
    outcome: 'success',
    requestId: context.requestId,
    metadata: {
      format: query.format,
      rowCount: rows.length,
      fields: [
        'occurredFrom',
        'occurredTo',
        ...(query.actorUserId ? ['actorUserId'] : []),
        ...(query.action ? ['action'] : []),
        ...(query.resourceType ? ['resourceType'] : []),
        ...(query.outcome ? ['outcome'] : []),
        ...(query.requestId ? ['requestId'] : []),
      ],
    },
  })
  return {
    body,
    contentType:
      query.format === 'csv' ? 'text/csv; charset=utf-8' : 'application/pdf',
    filename: `audit-export.${query.format}`,
  }
}
