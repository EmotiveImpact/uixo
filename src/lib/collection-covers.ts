/**
 * The order a collection cover fans its sites in. The third window sits in front, so each
 * cover takes a front member that no earlier cover has used, keeping the original order
 * where it can. Two covers never lead with the same screenshot.
 */
export function coverOrder<T>(sets: T[][], key: (item: T) => string, shown = 3): T[][] {
  const usedFronts = new Set<string>();
  return sets.map((members) => {
    const picked = members.slice(0, shown);
    const frontIndex = Math.min(shown, picked.length) - 1;
    if (frontIndex < 0) return picked;
    const front = picked[frontIndex];
    if (!usedFronts.has(key(front))) {
      usedFronts.add(key(front));
      return picked;
    }
    const swap = members.find((member) => !usedFronts.has(key(member)));
    if (!swap) return picked;
    usedFronts.add(key(swap));
    const rest = members.filter((member) => member !== swap).slice(0, frontIndex);
    return [...rest, swap];
  });
}
