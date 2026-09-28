import { Prisma } from '@prisma/client'

export const INVOICE_STATUSES = [
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'void',
] as const

export const PAYABLE_INVOICE_STATUSES = [
  'issued',
  'partially_paid',
  'paid',
] as const

export const PAYMENT_STATUSES = ['recorded', 'reversed'] as const
export const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer'] as const
export const BILLABLE_CATEGORIES = [
  'consultation',
  'laboratory',
  'pharmacy',
] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]
export type IssuedInvoiceStatus = 'issued' | 'partially_paid' | 'paid'
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type BillableCategory = (typeof BILLABLE_CATEGORIES)[number]

export const ZERO = new Prisma.Decimal(0)
const MONEY_SCALE = 4
const ROUNDING = Prisma.Decimal.ROUND_HALF_UP

export function toDecimal(
  value: Prisma.Decimal | string | number,
): Prisma.Decimal {
  return new Prisma.Decimal(value)
}

export function roundMoney(
  value: Prisma.Decimal | string | number,
): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(MONEY_SCALE, ROUNDING)
}

export function decimalString(
  value: Prisma.Decimal | string | number,
): string {
  return toDecimal(value).toString()
}

export function lineTotal(
  quantity: Prisma.Decimal | string | number,
  unitPrice: Prisma.Decimal | string | number,
): Prisma.Decimal {
  return roundMoney(toDecimal(quantity).mul(toDecimal(unitPrice)))
}

export function sumMoney(
  values: ReadonlyArray<Prisma.Decimal | string | number>,
): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>(
    (total, value) => total.plus(toDecimal(value)),
    ZERO,
  )
}

export function weightedAverageUnitPrice(
  allocations: ReadonlyArray<{
    quantity: Prisma.Decimal | string | number
    unitPrice: Prisma.Decimal | string | number
  }>,
): Prisma.Decimal {
  let numerator = ZERO
  let denominator = ZERO
  for (const allocation of allocations) {
    const quantity = toDecimal(allocation.quantity).abs()
    numerator = numerator.plus(quantity.mul(toDecimal(allocation.unitPrice)))
    denominator = denominator.plus(quantity)
  }
  if (denominator.lte(0)) {
    throw new Error('A pharmacy dispense must have a positive billed quantity.')
  }
  return roundMoney(numerator.div(denominator))
}

export function invoiceTotals(lineTotals: ReadonlyArray<Prisma.Decimal | string | number>): {
  subtotal: Prisma.Decimal
  discountAmount: Prisma.Decimal
  taxAmount: Prisma.Decimal
  totalAmount: Prisma.Decimal
} {
  const subtotal = roundMoney(sumMoney(lineTotals))
  return {
    subtotal,
    discountAmount: ZERO,
    taxAmount: ZERO,
    totalAmount: subtotal,
  }
}

export function deriveIssuedStatus(
  total: Prisma.Decimal | string | number,
  effectivePaid: Prisma.Decimal | string | number,
): IssuedInvoiceStatus {
  const totalAmount = toDecimal(total)
  const paid = toDecimal(effectivePaid)
  if (paid.lt(0) || paid.gt(totalAmount)) {
    throw new Error('Effective payments cannot be negative or exceed the invoice total.')
  }
  if (paid.eq(totalAmount)) return 'paid'
  if (paid.eq(0)) return 'issued'
  return 'partially_paid'
}

export function isDraft(status: string): boolean {
  return status === 'draft'
}

export function isVoid(status: string): boolean {
  return status === 'void'
}

export function isPayable(status: string): boolean {
  return (PAYABLE_INVOICE_STATUSES as readonly string[]).includes(status)
}
