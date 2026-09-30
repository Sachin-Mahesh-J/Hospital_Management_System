import { describe, expect, it } from 'vitest'
import {
  createMedicineBodySchema,
  listMedicinesQuerySchema,
  updateMedicineBodySchema,
} from '../src/modules/medicines/medicine.schemas.js'

describe('medicine request schemas', () => {
  it('trims valid medicine data and uppercases currency', () => {
    expect(
      createMedicineBodySchema.parse({
        code: '  PARA500  ',
        genericName: ' Paracetamol ',
        brandName: ' Panadol ',
        dosageForm: ' tablet ',
        strength: ' 500 mg ',
        inventoryUnit: ' tablet ',
        defaultSalePrice: '12.5000',
        currency: 'lkr',
        lowStockThreshold: '10',
      }),
    ).toMatchObject({
      code: 'PARA500',
      genericName: 'Paracetamol',
      brandName: 'Panadol',
      dosageForm: 'tablet',
      strength: '500 mg',
      inventoryUnit: 'tablet',
      defaultSalePrice: '12.5000',
      currency: 'LKR',
      lowStockThreshold: '10',
    })
  })

  it('rejects blank names, unknown currency, and mass assignment', () => {
    expect(() =>
      createMedicineBodySchema.parse({
        code: 'PARA500',
        genericName: '   ',
        dosageForm: 'tablet',
        inventoryUnit: 'tablet',
        currency: 'LKR',
      }),
    ).toThrow()
    expect(() =>
      createMedicineBodySchema.parse({
        code: 'PARA500',
        genericName: 'Paracetamol',
        dosageForm: 'tablet',
        inventoryUnit: 'tablet',
        currency: 'RUPEE',
      }),
    ).toThrow()
    expect(() =>
      createMedicineBodySchema.parse({
        code: 'PARA500',
        genericName: 'Paracetamol',
        dosageForm: 'tablet',
        inventoryUnit: 'tablet',
        currency: 'LKR',
        id: '11111111-1111-4111-8111-111111111111',
      }),
    ).toThrow()
    expect(() =>
      createMedicineBodySchema.parse({
        code: 'PARA500',
        genericName: 'Paracetamol',
        dosageForm: 'tablet',
        inventoryUnit: 'tablet',
        currency: 'LKR',
        status: 'inactive',
      }),
    ).toThrow()
  })

  it('rejects empty updates, status on update, and unknown sort fields', () => {
    expect(() => updateMedicineBodySchema.parse({})).toThrow()
    expect(() =>
      updateMedicineBodySchema.parse({ status: 'inactive' }),
    ).toThrow()
    expect(() =>
      listMedicinesQuerySchema.parse({ sortBy: 'passwordHash' }),
    ).toThrow()
    expect(
      listMedicinesQuerySchema.parse({ page: '2', status: 'inactive' }),
    ).toMatchObject({ page: 2, sortBy: 'genericName', status: 'inactive' })
  })
})
