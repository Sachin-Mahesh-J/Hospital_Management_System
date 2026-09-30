export const documentCategories = [
  'medical_report',
  'laboratory_report',
  'prescription',
  'referral',
  'other',
] as const
export type DocumentCategory = (typeof documentCategories)[number]

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  medical_report: 'Medical Report',
  laboratory_report: 'Laboratory Report',
  prescription: 'Prescription',
  referral: 'Referral',
  other: 'Other',
}

export type PatientDocument = {
  id: string
  patientId: string
  uploadedByUserId: string
  originalName: string
  detectedMediaType: string
  sizeBytes: string
  title: string
  category: string
  status: string
  description: string | null
  uploadedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export type DocumentAccess = {
  url: string
  expiresAt: string
}

export type DocumentFilters = {
  page: number
  pageSize: number
  category?: DocumentCategory
}

export type DocumentListResult = {
  data: PatientDocument[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export type DocumentMetadataUpdate = {
  title?: string
  category?: DocumentCategory
  description?: string | null
}
