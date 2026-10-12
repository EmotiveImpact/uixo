import type { Resource } from '../types';

/** How many of the most recent additions carry a "New" label. Roughly two weekday digests. */
export const NEW_WINDOW = 24;

/** The addedOrder at or above which a resource counts as new, given the full directory. */
export function newThreshold(all: readonly Pick<Resource, 'addedOrder'>[]): number {
  const orders = all.map((entry) => entry.addedOrder).sort((a, b) => b - a);
  return orders[Math.min(NEW_WINDOW, orders.length) - 1] ?? Infinity;
}
