import { describe, expect, it } from 'vitest'
import {
  aggregatePharmacyPrescriptionStatus,
  remainingQuantity,
  toDecimal,
} from '../src/modules/pharmacy/pharmacy.lifecycle.js'

describe('pharmacy prescription aggregation', () => {
  it('stays active when nothing effective has been dispensed', () => {
    expect(
      aggregatePharmacyPrescriptionStatus([
        { quantityPrescribed: '10', effectiveDispensed: '0' },
        { quantityPrescribed: '5', effectiveDispensed: '0' },
      ]),
    ).toBe('active')
  })

  it('is partially dispensed when remaining quantity exists', () => {
    expect(
      aggregatePharmacyPrescriptionStatus([
        { quantityPrescribed: '10', effectiveDispensed: '4' },
        { quantityPrescribed: '5', effectiveDispensed: '0' },
      ]),
    ).toBe('partially_dispensed')
    expect(
      aggregatePharmacyPrescriptionStatus([
        { quantityPrescribed: '10', effectiveDispensed: '10' },
        { quantityPrescribed: '5', effectiveDispensed: '2' },
      ]),
    ).toBe('partially_dispensed')
  })

  it('is dispensed only when every item is fully covered', () => {
    expect(
      aggregatePharmacyPrescriptionStatus([
        { quantityPrescribed: '10', effectiveDispensed: '10' },
        { quantityPrescribed: '5', effectiveDispensed: '5' },
      ]),
    ).toBe('dispensed')
  })

  it('calculates remaining quantity without going negative', () => {
    expect(remainingQuantity('10', '4').toString()).toBe('6')
    expect(remainingQuantity('3', '3').toString()).toBe('0')
    expect(remainingQuantity('2', '5').toString()).toBe('0')
    expect(toDecimal('1.2500').toString()).toBe('1.25')
  })
})
