import { readFile } from 'node:fs/promises';
import type { StorybookSnapshotItem } from './providers.ts';

export type AnimataSnapshot = {
  repo: 'codse/animata';
  ref: string;
  observedAt: string;
  items: StorybookSnapshotItem[];
};

export async function readAnimataSnapshot(): Promise<AnimataSnapshot> {
  const snapshot = JSON.parse(
    await readFile(new URL('../data/registry/snapshots/animata.json', import.meta.url), 'utf8'),
  ) as AnimataSnapshot;
  if (
    snapshot.repo !== 'codse/animata' ||
    !/^[a-f0-9]{40}$/.test(snapshot.ref) ||
    !Array.isArray(snapshot.items) ||
    !snapshot.items.length ||
    snapshot.items.some(
      (item) =>
        !/^animata\/[^/]+\/[^/]+\.tsx$/.test(item.path) ||
        !/^[a-z0-9-]+$/.test(item.category) ||
        !/^[A-Za-z0-9-]+$/.test(item.slug) ||
        !/^[a-z0-9-]+--[a-z0-9-]+$/.test(item.storyId),
    )
  )
    throw new Error('Animata snapshot is invalid. Re-capture from the official source.');
  return snapshot;
}
