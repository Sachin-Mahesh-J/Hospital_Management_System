import { Prisma } from '@prisma/client'
import { database } from '../../database/database.service.js'

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
