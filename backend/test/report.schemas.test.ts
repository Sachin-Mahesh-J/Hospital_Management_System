import { describe, expect, it } from 'vitest'
import {
  dashboardQuerySchema,
  listAppointmentReportQuerySchema,
  listLaboratoryReportQuerySchema,
  listPatientReportQuerySchema,
  listPharmacyReportQuerySchema,
  listRevenueReportQuerySchema,
  listStaffReportQuerySchema,
} from '../src/modules/reports/report.schemas.js'

describe('report query schemas', () => {
  it('rejects unknown fields and invalid patient status filters', () => {
    expect(listPatientReportQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    })
    expect(() =>
      listPatientReportQuerySchema.parse({ status: 'archived' }),
    ).toThrow()
    expect(() =>
      listPatientReportQuerySchema.parse({ page: 1, unexpected: true }),
    ).toThrow()
  })

  it('requires a bounded appointment date range and does not swap inverted dates', () => {
    expect(() => listAppointmentReportQuerySchema.parse({})).toThrow()
    expect(() =>
      listAppointmentReportQuerySchema.parse({
        from: '2031-03-02',
        to: '2031-03-01',
      }),
    ).toThrow()
    expect(() =>
      listAppointmentReportQuerySchema.parse({
        from: '2031-01-01',
        to: '2032-01-02',
      }),
    ).toThrow()
    expect(
      listAppointmentReportQuerySchema.parse({
        from: '2031-03-01',
        to: '2031-03-01',
        status: 'scheduled',
      }),
    ).toMatchObject({
      from: '2031-03-01',
      to: '2031-03-01',
      status: 'scheduled',
      page: 1,
      pageSize: 20,
    })
  })

  it('accepts controlled revenue and pharmacy filters only', () => {
    expect(
      listRevenueReportQuerySchema.parse({
        from: '2031-03-01',
        to: '2031-03-31',
        method: 'cash',
      }),
    ).toMatchObject({ method: 'cash' })
    expect(() =>
      listRevenueReportQuerySchema.parse({
        from: '2031-03-01',
        to: '2031-03-31',
        method: 'crypto',
      }),
    ).toThrow()
    expect(listPharmacyReportQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      section: 'low_stock',
    })
    expect(() =>
      listPharmacyReportQuerySchema.parse({ section: 'expired' }),
    ).toThrow()
  })

  it('bounds laboratory and staff report queries', () => {
    expect(() =>
      listLaboratoryReportQuerySchema.parse({
        from: 'not-a-date',
        to: '2031-03-01',
      }),
    ).toThrow()
    expect(
      listStaffReportQuerySchema.parse({
        employmentStatus: 'active',
        departmentId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toMatchObject({
      employmentStatus: 'active',
      pageSize: 20,
    })
    expect(() => dashboardQuerySchema.parse({ extra: '1' })).toThrow()
    expect(() =>
      listPatientReportQuerySchema.parse({ pageSize: 101 }),
    ).toThrow()
  })
})
