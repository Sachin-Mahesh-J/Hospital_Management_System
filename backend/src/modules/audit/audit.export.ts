import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib'
import type { SafeAuditDto } from './audit.sanitize.js'

const auditFontPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'fonts',
  'NotoSans-Regular.ttf',
)

let auditFontBytes: Uint8Array | undefined
let auditCoverage:
  | { hasGlyphForCodePoint: (codePoint: number) => boolean }
  | undefined

function loadAuditFont(): Uint8Array {
  auditFontBytes ??= readFileSync(auditFontPath)
  return auditFontBytes
}

function loadAuditCoverage(): {
  hasGlyphForCodePoint: (codePoint: number) => boolean
} {
  auditCoverage ??= fontkit.create(loadAuditFont())
  return auditCoverage
}

function textForAuditFont(text: string): string {
  const coverage = loadAuditCoverage()
  let output = ''
  for (const character of text) {
    const codePoint = character.codePointAt(0)
    if (codePoint === undefined) continue
    if (coverage.hasGlyphForCodePoint(codePoint)) {
      output += character
      continue
    }
    output += `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`
  }
  return output
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

export function buildAuditCsv(rows: readonly SafeAuditDto[]): string {
  const header = [
    'timestamp',
    'actorUserId',
    'actorUsername',
    'action',
    'resourceType',
    'resourceId',
    'requestId',
    'outcome',
    'metadata',
  ]
  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.occurredAt,
        row.actorUserId ?? '',
        row.actorUsername ?? '',
        row.action,
        row.resourceType,
        row.resourceId ?? '',
        row.requestId ?? '',
        row.outcome,
        JSON.stringify(row.metadata),
      ]
        .map(csvEscape)
        .join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

export async function buildAuditPdf(
  rows: readonly SafeAuditDto[],
): Promise<Buffer> {
  const document = await PDFDocument.create()
  document.registerFontkit(fontkit)
  const font: PDFFont = await document.embedFont(loadAuditFont(), {
    subset: true,
  })
  const fontSize = 8
  const lineHeight = 11
  const margin = 36
  let page = document.addPage()
  let { width, height } = page.getSize()
  let y = height - margin

  const writeLine = (text: string) => {
    if (y < margin + lineHeight) {
      page = document.addPage()
      ;({ width, height } = page.getSize())
      y = height - margin
    }
    page.drawText(textForAuditFont(text.slice(0, 140)), {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: width - margin * 2,
    })
    y -= lineHeight
  }

  writeLine('HMS audit export (sanitized fields only)')
  y -= 4
  for (const row of rows) {
    writeLine(
      `${row.occurredAt}  ${row.outcome}  ${row.action}  ${row.resourceType}  ${row.resourceId ?? '-'}`,
    )
    writeLine(
      `  actor=${row.actorUsername ?? row.actorUserId ?? '-'}  request=${row.requestId ?? '-'}`,
    )
  }
  return Buffer.from(await document.save())
}
