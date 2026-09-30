export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

export const DOCUMENT_CATEGORIES = [
  'medical_report',
  'laboratory_report',
  'prescription',
  'referral',
  'other',
] as const

export const DOCUMENT_MEDIA_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]
export type DocumentMediaType = (typeof DOCUMENT_MEDIA_TYPES)[number]

const PDF_MAGIC = Buffer.from('%PDF')
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff])
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function detectDocumentMediaType(
  bytes: Buffer,
): DocumentMediaType | null {
  if (bytes.length >= 4 && bytes.subarray(0, 4).equals(PDF_MAGIC)) {
    return 'application/pdf'
  }
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(JPEG_MAGIC)) {
    return 'image/jpeg'
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    return 'image/png'
  }
  return null
}
