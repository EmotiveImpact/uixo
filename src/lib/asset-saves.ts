import { readStored, writeStored } from './storage.js';

export const ASSET_SAVES_KEY = 'uixo.asset-saves.v2';
export const ASSET_SAVES_OWNER_KEY = 'uixo.asset-saves-owner.v1';

const ASSET_ID = /^[a-z0-9][a-z0-9._/-]{0,179}$/;
const MAX_SAVED_ASSETS = 200;

/** Shape the account API accepts. Null means the body is not an asset-id snapshot. */
export function normalizeAssetIds(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length > MAX_SAVED_ASSETS) return null;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of input) {
    if (typeof candidate !== 'string') return null;
    const id = candidate.trim();
    if (!id || !ASSET_ID.test(id) || id.includes('..')) return null;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function parseSavedAssets(value: string | null): string[] {
  try {
    return normalizeAssetIds(JSON.parse(value ?? '[]')) ?? [];
  } catch {
    return [];
  }
}

export function loadAssetSaves(): string[] {
  return normalizeAssetIds(readStored<unknown>(ASSET_SAVES_KEY, [])) ?? [];
}

export function saveAssetSaves(assetIds: string[]): boolean {
  return writeStored(ASSET_SAVES_KEY, assetIds);
}

export function loadAssetSaveOwner(): string | null {
  const value = readStored<unknown>(ASSET_SAVES_OWNER_KEY, null);
  return typeof value === 'string' && value.trim() ? value : null;
}

export function saveAssetSaveOwner(userId: string): void {
  writeStored(ASSET_SAVES_OWNER_KEY, userId);
}

export function clearAssetSaveOwner(): void {
  try {
    localStorage.removeItem(ASSET_SAVES_OWNER_KEY);
  } catch {
    // A blocked storage area is already handled by the local fallback.
  }
}

export function mergeAssetSaves(local: string[], remote: string[]): string[] {
  return [...new Set([...remote, ...local])].slice(0, MAX_SAVED_ASSETS);
}

export function assetSavesEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
