import { Prisma } from '@prisma/client'

export const PHARMACY_PRESCRIPTION_STATUSES = [
  'active',
  'partially_dispensed',
  'dispensed',
] as const

export type PharmacyPrescriptionStatus =
  (typeof PHARMACY_PRESCRIPTION_STATUSES)[number]

export function toDecimal(value: Prisma.Decimal | string | number): Prisma.Decimal {
  return new Prisma.Decimal(value)
}

export function decimalString(value: Prisma.Decimal | string | number): string {
  return toDecimal(value).toString()
}

export function remainingQuantity(
  prescribed: Prisma.Decimal | string | number,
  effectiveDispensed: Prisma.Decimal | string | number,
): Prisma.Decimal {
  const remaining = toDecimal(prescribed).minus(toDecimal(effectiveDispensed))
  return remaining.lt(0) ? new Prisma.Decimal(0) : remaining
}

export function minDecimal(
  left: Prisma.Decimal,
  right: Prisma.Decimal,
): Prisma.Decimal {
  return left.lt(right) ? left : right
}

export function aggregatePharmacyPrescriptionStatus(
  items: ReadonlyArray<{
    quantityPrescribed: Prisma.Decimal | string | number
    effectiveDispensed: Prisma.Decimal | string | number
  }>,
): PharmacyPrescriptionStatus {
  if (items.length === 0) {
    throw new Error('A prescription must have at least one item.')
  }

  const hasAnyDispense = items.some((item) =>
    toDecimal(item.effectiveDispensed).gt(0),
  )
  if (!hasAnyDispense) return 'active'

  const allFullyDispensed = items.every((item) =>
    toDecimal(item.effectiveDispensed).gte(toDecimal(item.quantityPrescribed)),
  )
  if (allFullyDispensed) return 'dispensed'

  return 'partially_dispensed'
}
