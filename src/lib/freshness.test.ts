import { describe, expect, it } from 'vitest';
import { NEW_WINDOW, newThreshold } from './freshness';

describe('newThreshold', () => {
  it('marks only the most recent additions as new', () => {
    const all = Array.from({ length: NEW_WINDOW + 10 }, (_, index) => ({ addedOrder: index + 1 }));
    const threshold = newThreshold(all);
    expect(all.filter((entry) => entry.addedOrder >= threshold)).toHaveLength(NEW_WINDOW);
  });

  it('treats everything as new when the directory is smaller than the window', () => {
    expect(newThreshold([{ addedOrder: 3 }, { addedOrder: 1 }])).toBe(1);
  });

  it('marks nothing as new in an empty directory', () => {
    expect(newThreshold([])).toBe(Infinity);
  });
});
