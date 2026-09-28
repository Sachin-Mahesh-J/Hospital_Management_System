export const MAX_REPORT_RANGE_DAYS = 366
export const NEAR_EXPIRY_DAYS = 30
export const PHARMACY_REPORT_SECTIONS = ['low_stock', 'near_expiry'] as const

export type PharmacyReportSection = (typeof PHARMACY_REPORT_SECTIONS)[number]
