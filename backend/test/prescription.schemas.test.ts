import { describe, expect, it } from 'vitest'
import {
  cancelPrescriptionBodySchema,
  createPrescriptionBodySchema,
  listPrescriptionsQuerySchema,
} from '../src/modules/prescriptions/prescription.schemas.js'

const medicalRecordId = '11111111-1111-4111-8111-111111111111'
const medicineId = '22222222-2222-4222-8222-222222222222'

const item = {
  medicineId,
  dosage: '500 mg',
  frequency: 'twice daily',
  duration: '5 days',
  quantityPrescribed: '10',
  unit: 'tablet',
}

describe('prescription request schemas', () => {
  it('requires at least one item and rejects client-controlled identity or status', () => {
    expect(
      createPrescriptionBodySchema.parse({
        medicalRecordId,
        items: [{ ...item, dosage: '  500 mg  ' }],
      }),
    ).toMatchObject({
      items: [{ dosage: '500 mg', quantityPrescribed: '10' }],
    })
    expect(() =>
      createPrescriptionBodySchema.parse({
        medicalRecordId,
        items: [],
      }),
    ).toThrow()
    expect(() =>
      createPrescriptionBodySchema.parse({
        medicalRecordId,
        prescribedByDoctorId: '33333333-3333-4333-8333-333333333333',
        items: [item],
      }),
    ).toThrow()
    expect(() =>
      createPrescriptionBodySchema.parse({
        medicalRecordId,
        status: 'dispensed',
        items: [item],
      }),
    ).toThrow()
  })

  it('rejects non-positive quantities', () => {
    expect(() =>
      createPrescriptionBodySchema.parse({
        medicalRecordId,
        items: [{ ...item, quantityPrescribed: 0 }],
      }),
    ).toThrow()
    expect(() =>
      createPrescriptionBodySchema.parse({
        medicalRecordId,
        items: [{ ...item, quantityPrescribed: '-1' }],
      }),
    ).toThrow()
  })

  it('requires a cancellation reason', () => {
    expect(() => cancelPrescriptionBodySchema.parse({})).toThrow()
    expect(
      cancelPrescriptionBodySchema.parse({
        cancellationReason: ' Entered in error ',
      }),
    ).toEqual({ cancellationReason: 'Entered in error' })
  })

  it('whitelists list filters', () => {
    expect(
      listPrescriptionsQuerySchema.parse({ status: 'active', page: '1' }),
    ).toMatchObject({ status: 'active', sortBy: 'prescribedAt' })
    expect(() =>
      listPrescriptionsQuerySchema.parse({ sortBy: 'dosage' }),
    ).toThrow()
  })
})
