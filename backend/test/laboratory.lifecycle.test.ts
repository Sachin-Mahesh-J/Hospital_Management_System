import { describe, expect, it } from 'vitest'
import { aggregateLabRequestStatus } from '../src/modules/laboratory/laboratory.lifecycle.js'

describe('laboratory request aggregate status', () => {
  it('uses a uniform parent status when every item matches', () => {
    expect(aggregateLabRequestStatus(['requested', 'requested'])).toBe('requested')
    expect(
      aggregateLabRequestStatus(['sample_collected', 'sample_collected']),
    ).toBe('sample_collected')
    expect(aggregateLabRequestStatus(['completed'])).toBe('completed')
  })

  it('uses in_progress for mixed item statuses', () => {
    expect(
      aggregateLabRequestStatus(['completed', 'sample_collected']),
    ).toBe('in_progress')
    expect(
      aggregateLabRequestStatus(['requested', 'sample_collected']),
    ).toBe('in_progress')
    expect(aggregateLabRequestStatus(['in_progress', 'in_progress'])).toBe(
      'in_progress',
    )
  })
})
