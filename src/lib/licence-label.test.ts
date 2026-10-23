import { describe, expect, it } from 'vitest';
import { licenceLabel } from './licence-label';

describe('licenceLabel', () => {
  it('says Free only when the licence allows commercial use', () => {
    expect(licenceLabel({ price: 'free', licence: { commercial: 'allowed' } })).toEqual({
      text: 'Free',
      settled: true,
    });
  });

  it('says Licence unknown, with the detail sentence, when commercial use is unknown', () => {
    const label = licenceLabel({ price: 'free', licence: { commercial: 'unknown' } });
    expect(label.text).toBe('Licence unknown');
    expect(label.settled).toBe(false);
    expect(label.detail).toBe(
      'Free to view. No licence declared, so check with the creator before using it in paid work.',
    );
  });

  it('never calls a restricted licence free', () => {
    expect(licenceLabel({ price: 'free', licence: { commercial: 'restricted' } }).text).toBe(
      'Licence restricted',
    );
  });

  it('keeps Paid for paid assets', () => {
    expect(licenceLabel({ price: 'paid', licence: { commercial: 'unknown' } }).text).toBe('Paid');
  });
});
