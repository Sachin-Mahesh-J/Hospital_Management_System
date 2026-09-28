import { describe, expect, it } from 'vitest'
import {
  adjustStockBodySchema,
  dispenseItemBodySchema,
  receiveStockBodySchema,
  reverseDispenseBodySchema,
} from '../src/modules/pharmacy/pharmacy.schemas.js'

const medicineId = '11111111-1111-4111-8111-111111111111'
const batchId = '22222222-2222-4222-8222-222222222222'
const employeeId = '33333333-3333-4333-8333-333333333333'

describe('pharmacy schemas', () => {
  it('accepts a valid receipt and requires price and currency fields', () => {
    expect(
      receiveStockBodySchema.parse({
        medicineId,
        batchNumber: 'B-100',
        expiryDate: '2031-01-15',
        quantity: '25',
        unitCost: '10.5000',
        salePriceSnapshot: '18',
        currency: 'LKR',
      }),
    ).toMatchObject({
      batchNumber: 'B-100',
      currency: 'LKR',
      quantity: '25',
    })
    expect(() =>
      receiveStockBodySchema.parse({
        medicineId,
        batchNumber: 'B-100',
        expiryDate: '2031-01-15',
        quantity: '0',
        unitCost: '10',
        salePriceSnapshot: '18',
        currency: 'LKR',
      }),
    ).toThrow()
    expect(() =>
      receiveStockBodySchema.parse({
        medicineId,
        batchNumber: 'B-100',
        expiryDate: '2031-13-40',
        quantity: '1',
        unitCost: '10',
        salePriceSnapshot: '18',
        currency: 'LKR',
      }),
    ).toThrow()
  })

  it('rejects client-supplied actor identity on pharmacy writes', () => {
    expect(() =>
      receiveStockBodySchema.parse({
        medicineId,
        batchNumber: 'B-100',
        expiryDate: '2031-01-15',
        quantity: '1',
        unitCost: '10',
        salePriceSnapshot: '18',
        currency: 'LKR',
        employeeId,
        pharmacistId: employeeId,
      }),
    ).toThrow()
    expect(() =>
      adjustStockBodySchema.parse({
        medicineBatchId: batchId,
        quantity: '-1',
        reason: 'Damaged',
        performedByUserId: employeeId,
      }),
    ).toThrow()
    expect(() =>
      dispenseItemBodySchema.parse({
        quantity: '1',
        dispensedByEmployeeId: employeeId,
        medicineBatchId: batchId,
      }),
    ).toThrow()
    expect(() =>
      reverseDispenseBodySchema.parse({
        reason: 'Wrong patient',
        reversedByUserId: employeeId,
      }),
    ).toThrow()
  })

  it('requires a non-zero adjustment and a reason', () => {
    expect(
      adjustStockBodySchema.parse({
        medicineBatchId: batchId,
        quantity: '-2.5',
        reason: 'Count correction',
      }),
    ).toEqual({
      medicineBatchId: batchId,
      quantity: '-2.5',
      reason: 'Count correction',
    })
    expect(() =>
      adjustStockBodySchema.parse({
        medicineBatchId: batchId,
        quantity: '0',
        reason: 'No change',
      }),
    ).toThrow()
    expect(() =>
      reverseDispenseBodySchema.parse({ reason: '   ' }),
    ).toThrow()
  })
})
