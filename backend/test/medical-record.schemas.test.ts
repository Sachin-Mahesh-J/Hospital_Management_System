import { describe, expect, it } from 'vitest'
import {
  amendMedicalRecordBodySchema,
  createMedicalRecordBodySchema,
  listMedicalRecordsQuerySchema,
  updateMedicalRecordBodySchema,
} from '../src/modules/medical-records/medical-record.schemas.js'

const patientId = '11111111-1111-4111-8111-111111111111'

describe('medical record request schemas', () => {
  it('accepts draft creation and rejects client-controlled author or status', () => {
    expect(
      createMedicalRecordBodySchema.parse({
        patientId,
        occurredAt: '2030-01-01T10:00:00Z',
        diagnoses: [{ diagnosisText: '  Influenza  ' }],
      }),
    ).toMatchObject({
      diagnoses: [{ diagnosisText: 'Influenza' }],
    })
    expect(() =>
      createMedicalRecordBodySchema.parse({
        patientId,
        occurredAt: '2030-01-01T10:00:00Z',
        authorEmployeeId: '22222222-2222-4222-8222-222222222222',
      }),
    ).toThrow()
    expect(() =>
      createMedicalRecordBodySchema.parse({
        patientId,
        occurredAt: '2030-01-01T10:00:00Z',
        status: 'final',
        finalizedAt: '2030-01-01T10:00:00Z',
      }),
    ).toThrow()
  })

  it('rejects both appointment and admission on create', () => {
    expect(() =>
      createMedicalRecordBodySchema.parse({
        patientId,
        occurredAt: '2030-01-01T10:00:00Z',
        appointmentId: '33333333-3333-4333-8333-333333333333',
        admissionId: '44444444-4444-4444-8444-444444444444',
      }),
    ).toThrow()
  })

  it('restricts draft updates and requires an amendment reason', () => {
    expect(() =>
      updateMedicalRecordBodySchema.parse({ patientId }),
    ).toThrow()
    expect(() =>
      updateMedicalRecordBodySchema.parse({
        authorEmployeeId: '22222222-2222-4222-8222-222222222222',
      }),
    ).toThrow()
    expect(
      updateMedicalRecordBodySchema.parse({
        diagnoses: [{ diagnosisText: 'Revised' }],
      }),
    ).toEqual({ diagnoses: [{ diagnosisText: 'Revised' }] })
    expect(() => amendMedicalRecordBodySchema.parse({
      occurredAt: '2030-01-02T10:00:00Z',
    })).toThrow()
    expect(
      amendMedicalRecordBodySchema.parse({
        occurredAt: '2030-01-02T10:00:00Z',
        reason: ' Clarification ',
        diagnoses: [{ diagnosisText: 'Updated' }],
      }),
    ).toMatchObject({ reason: 'Clarification' })
  })

  it('whitelists list filters and sorting', () => {
    expect(
      listMedicalRecordsQuerySchema.parse({
        page: '2',
        status: 'draft',
      }),
    ).toMatchObject({
      page: 2,
      sortBy: 'occurredAt',
      status: 'draft',
    })
    expect(() =>
      listMedicalRecordsQuerySchema.parse({ sortBy: 'diagnosis_text' }),
    ).toThrow()
    expect(() =>
      listMedicalRecordsQuerySchema.parse({ status: 'signed' }),
    ).toThrow()
  })
})
