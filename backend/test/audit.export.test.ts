import { describe, expect, it } from 'vitest'
import { buildAuditCsv, buildAuditPdf } from '../src/modules/audit/audit.export.js'
import type { SafeAuditDto } from '../src/modules/audit/audit.sanitize.js'
import { extractPdfText } from './pdfUnicode.js'

function row(actorUsername: string): SafeAuditDto {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    occurredAt: '2026-09-29T00:00:00.000Z',
    actorUserId: '22222222-2222-4222-8222-222222222222',
    actorUsername,
    action: 'user.create',
    resourceType: 'user',
    resourceId: '33333333-3333-4333-8333-333333333333',
    requestId: '44444444-4444-4444-8444-444444444444',
    outcome: 'success',
    metadata: { fields: ['username'] },
  }
}

describe('audit PDF export', () => {
  it('embeds Unicode audit values and still renders ASCII', async () => {
    const names = ['Sachin', 'José', 'Mādhavi', 'François']
    const pdf = await buildAuditPdf(names.map(row))
    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-')
    expect(pdf.length).toBeGreaterThan(100)

    const text = extractPdfText(pdf)
    for (const name of names) {
      expect(text).toContain(name)
    }
    expect(text).toContain('user.create')
    expect(text).toContain('success')
    expect(text).not.toContain('?')
  })

  it('keeps a PDF export successful when a character is outside the embedded font', async () => {
    const pdf = await buildAuditPdf([row('José 你')])
    const text = extractPdfText(pdf)
    expect(pdf.length).toBeGreaterThan(100)
    expect(text).toContain('José')
    expect(text).toContain('U+4F60')
    expect(text).not.toContain('?')
  })

  it('preserves Unicode in CSV export', () => {
    const csv = buildAuditCsv([row('Sachin'), row('Mādhavi')])
    expect(csv).toContain('Sachin')
    expect(csv).toContain('Mādhavi')
  })
})
