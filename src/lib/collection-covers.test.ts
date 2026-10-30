import { describe, expect, it } from 'vitest';
import { coverOrder } from './collection-covers';

const id = (value: string) => value;

describe('collection cover order', () => {
  it('keeps each cover as it is when the fronts already differ', () => {
    expect(
      coverOrder(
        [
          ['a', 'b', 'c'],
          ['d', 'e', 'f'],
        ],
        id,
      ),
    ).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]);
  });

  it('never puts the same site in front of two covers', () => {
    const covers = coverOrder(
      [
        ['grainient', 'shadcn', 'orbkit', 'lucide'],
        ['shadcn', 'lucide', 'orbkit', 'built'],
        ['orbkit', 'reactbits', 'grainient'],
      ],
      id,
    );
    const fronts = covers.map((cover) => cover[cover.length - 1]);
    expect(new Set(fronts).size).toBe(3);
    expect(covers[0]).toEqual(['grainient', 'shadcn', 'orbkit']);
    expect(covers.every((cover) => cover.length === 3)).toBe(true);
  });

  it('keeps a cover unchanged when every member already leads another cover', () => {
    expect(
      coverOrder(
        [
          ['a', 'b'],
          ['b', 'a'],
        ],
        id,
      ),
    ).toEqual([
      ['a', 'b'],
      ['b', 'a'],
    ]);
  });
});
