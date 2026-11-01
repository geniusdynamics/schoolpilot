// ABOUTME: Tests which grading scale a class's aggregate is placed in: the scale its assessments
// ABOUTME: agree on, the programme's only scale, or none when the data cannot name one.

import { describe, expect, it } from 'vitest';

import { aggregateScaleCode, defaultAggregation } from '../aggregation';

const scales = [
  { id: 'scale-numeric', code: 'demo_numeric' },
  { id: 'scale-cbe', code: 'cbe_bands' },
];

describe('aggregateScaleCode', () => {
  it('uses the scale every assessment of the class names', () => {
    expect(
      aggregateScaleCode(
        [{ grading_scale_id: 'scale-cbe' }, { grading_scale_id: 'scale-cbe' }],
        scales
      )
    ).toBe('cbe_bands');
  });

  it('falls back to the programme scale when the assessments name none', () => {
    expect(aggregateScaleCode([{}, {}], [scales[0]])).toBe('demo_numeric');
  });

  it('names no scale when the class mixes scales', () => {
    expect(
      aggregateScaleCode(
        [{ grading_scale_id: 'scale-cbe' }, { grading_scale_id: 'scale-numeric' }],
        scales
      )
    ).toBeUndefined();
  });

  it('names no scale when nothing declares one and the programme has several', () => {
    expect(aggregateScaleCode([{}], scales)).toBeUndefined();
  });
});

describe('defaultAggregation', () => {
  it('carries the result scale so the aggregate is graded', () => {
    expect(defaultAggregation('demo_numeric')).toMatchObject({
      code: 'learning_area_mean',
      op: 'mean',
      result_scale: 'demo_numeric',
    });
  });

  it('stays ungraded when no scale is known', () => {
    expect(defaultAggregation()).not.toHaveProperty('result_scale');
  });
});
