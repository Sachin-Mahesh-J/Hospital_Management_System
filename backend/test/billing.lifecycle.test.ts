import { describe, expect, it } from 'vitest'
import {
  deriveIssuedStatus,
  invoiceTotals,
  lineTotal,
  roundMoney,
  weightedAverageUnitPrice,
} from '../src/modules/billing/billing.lifecycle.js'

describe('billing money calculations', () => {
  it('rounds line totals to four decimal places', () => {
    expect(lineTotal('3', '10.3333').toFixed(4)).toBe('30.9999')
    expect(lineTotal('2', '1.255').toFixed(4)).toBe('2.5100')
  })

  it('computes a quantity-weighted pharmacy unit price', () => {
    expect(
      weightedAverageUnitPrice([
        { quantity: '2', unitPrice: '10' },
        { quantity: '1', unitPrice: '13' },
      ]).toFixed(4),
    ).toBe('11.0000')
    expect(
      weightedAverageUnitPrice([
        { quantity: '-2', unitPrice: '10.0000' },
        { quantity: '-1', unitPrice: '13.0000' },
      ]).toFixed(4),
    ).toBe('11.0000')
  })

  it('keeps tax and discount at zero so total equals subtotal', () => {
    const totals = invoiceTotals(['10.5', '2.25'])
    expect(totals.subtotal.toString()).toBe('12.75')
    expect(totals.discountAmount.toString()).toBe('0')
    expect(totals.taxAmount.toString()).toBe('0')
    expect(totals.totalAmount.toString()).toBe('12.75')
  })

  it('derives issued payment status from effective payments', () => {
    expect(deriveIssuedStatus('100', '0')).toBe('issued')
    expect(deriveIssuedStatus('100', '40')).toBe('partially_paid')
    expect(deriveIssuedStatus('100', '100')).toBe('paid')
    expect(deriveIssuedStatus('0', '0')).toBe('paid')
  })

  it('rejects effective payments above the invoice total', () => {
    expect(() => deriveIssuedStatus('10', '10.0001')).toThrow(/exceed/)
  })

  it('rounds half away from zero at four decimals', () => {
    expect(roundMoney('1.23456').toFixed(4)).toBe('1.2346')
    expect(roundMoney('1.23455').toFixed(4)).toBe('1.2346')
  })
})
