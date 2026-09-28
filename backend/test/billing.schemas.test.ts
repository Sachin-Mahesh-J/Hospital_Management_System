import { describe, expect, it } from 'vitest'
import {
  createInvoiceBodySchema,
  createPaymentBodySchema,
  reversePaymentBodySchema,
  updateInvoiceBodySchema,
  voidInvoiceBodySchema,
} from '../src/modules/billing/billing.schemas.js'

const appointmentId = '11111111-1111-4111-8111-111111111111'
const labRequestItemId = '22222222-2222-4222-8222-222222222222'
const dispenseRecordId = '33333333-3333-4333-8333-333333333333'
const patientId = '44444444-4444-4444-8444-444444444444'

describe('billing schemas', () => {
  it('accepts mixed billable sources and ignores client totals', () => {
    const parsed = createInvoiceBodySchema.parse({
      patientId,
      items: [
        { category: 'consultation', appointmentId, unitPrice: '1500.50' },
        { category: 'laboratory', labRequestItemId },
        { category: 'pharmacy', dispenseRecordId },
      ],
    })
    expect(parsed.items).toHaveLength(3)
  })

  it('rejects empty invoices, admission items, and client financial fields', () => {
    expect(() =>
      createInvoiceBodySchema.parse({ patientId, items: [] }),
    ).toThrow()
    expect(() =>
      createInvoiceBodySchema.parse({
        patientId,
        items: [{ category: 'admission', admissionId: appointmentId }],
      }),
    ).toThrow()
    expect(() =>
      createInvoiceBodySchema.parse({
        patientId,
        invoiceNumber: 'INV-CLIENT',
        items: [{ category: 'consultation', appointmentId, unitPrice: '10' }],
      }),
    ).toThrow()
    expect(() =>
      createInvoiceBodySchema.parse({
        patientId,
        subtotal: '10',
        items: [{ category: 'consultation', appointmentId, unitPrice: '10' }],
      }),
    ).toThrow()
    expect(() =>
      createInvoiceBodySchema.parse({
        patientId,
        items: [
          {
            category: 'laboratory',
            labRequestItemId,
            unitPrice: '99',
          },
        ],
      }),
    ).toThrow()
  })

  it('requires a consultation unit price and rejects client pharmacy prices', () => {
    expect(() =>
      createInvoiceBodySchema.parse({
        patientId,
        items: [{ category: 'consultation', appointmentId }],
      }),
    ).toThrow()
    expect(() =>
      createInvoiceBodySchema.parse({
        patientId,
        items: [
          { category: 'pharmacy', dispenseRecordId, unitPrice: '5' },
        ],
      }),
    ).toThrow()
    expect(() =>
      updateInvoiceBodySchema.parse({
        items: [{ category: 'consultation', appointmentId, unitPrice: '-1' }],
      }),
    ).toThrow()
  })

  it('validates payments and reversal reasons', () => {
    expect(
      createPaymentBodySchema.parse({
        amount: '10.25',
        method: 'cash',
      }).amount,
    ).toBe('10.25')
    expect(() =>
      createPaymentBodySchema.parse({ amount: '0', method: 'cash' }),
    ).toThrow()
    expect(() =>
      createPaymentBodySchema.parse({ amount: '1', method: 'cheque' }),
    ).toThrow()
    expect(() =>
      createPaymentBodySchema.parse({
        amount: '1',
        method: 'card',
        cardNumber: '4111111111111111',
      }),
    ).toThrow()
    expect(() => reversePaymentBodySchema.parse({ reason: '  ' })).toThrow()
    expect(() => voidInvoiceBodySchema.parse({ reason: '' })).toThrow()
    expect(voidInvoiceBodySchema.parse({ reason: 'Entered in error' }).reason).toBe(
      'Entered in error',
    )
  })
})
