import type { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'
import type { ListAuditQuery } from './audit.schemas.js'
import {
  sanitizeAuditMetadata,
  type SafeAuditDto,
} from './audit.sanitize.js'

export const MAX_EXPORT_ROWS = 5_000

type AuditListRecord = {
  id: string
  occurredAt: Date
  actorUserId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  requestId: string | null
  outcome: string
  metadata: Prisma.JsonValue
  actor: { username: string } | null
}

function auditWhere(query: Omit<ListAuditQuery, 'page' | 'pageSize'>): Prisma.AuditLogWhereInput {
  return {
    occurredAt: {
      gte: new Date(query.occurredFrom),
      lt: new Date(query.occurredTo),
    },
    ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.resourceType ? { resourceType: query.resourceType } : {}),
    ...(query.outcome ? { outcome: query.outcome } : {}),
    ...(query.requestId ? { requestId: query.requestId } : {}),
  }
}

export function toSafeAuditDto(row: AuditListRecord): SafeAuditDto {
  return {
    id: row.id,
    occurredAt: row.occurredAt.toISOString(),
    actorUserId: row.actorUserId,
    actorUsername: row.actor?.username ?? null,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    requestId: row.requestId,
    outcome: row.outcome,
    metadata: sanitizeAuditMetadata(row.metadata),
  }
}

export async function listAuditRecords(query: ListAuditQuery): Promise<{
  records: SafeAuditDto[]
  totalItems: number
}> {
  const where = auditWhere(query)
  const totalItems = await database.client.auditLog.count({ where })
  const offset = (query.page - 1) * query.pageSize
  const rows =
    offset >= totalItems
      ? []
      : await database.client.auditLog.findMany({
          where,
          skip: offset,
          take: query.pageSize,
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            occurredAt: true,
            actorUserId: true,
            action: true,
            resourceType: true,
            resourceId: true,
            requestId: true,
            outcome: true,
            metadata: true,
            actor: { select: { username: true } },
          },
        })
  return { records: rows.map(toSafeAuditDto), totalItems }
}

export async function listAuditRecordsForExport(
  query: Omit<ListAuditQuery, 'page' | 'pageSize'>,
): Promise<SafeAuditDto[]> {
  const where = auditWhere(query)
  const rows = await database.client.auditLog.findMany({
    where,
    take: MAX_EXPORT_ROWS + 1,
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      occurredAt: true,
      actorUserId: true,
      action: true,
      resourceType: true,
      resourceId: true,
      requestId: true,
      outcome: true,
      metadata: true,
      actor: { select: { username: true } },
    },
  })
  return rows.map(toSafeAuditDto)
}
