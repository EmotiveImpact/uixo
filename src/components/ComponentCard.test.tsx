import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AssetRecord } from '../lib/asset-library';
import { ComponentCard } from './ComponentCard';

class ObserverStub {
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ObserverStub);
  vi.stubGlobal('IntersectionObserver', ObserverStub);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const asset = (commercial: string): AssetRecord => ({
  id: 'simply-buttons/arttech-download',
  providerId: 'simply-buttons',
  slug: 'arttech-download',
  name: 'ART+TECH download CTA',
  description: '',
  kind: 'component',
  category: 'buttons',
  price: 'free',
  tags: [],
  sourceUrl: 'https://github.com/example/simply-buttons',
  verifiedAt: null,
  preview: null,
  licence: {
    expression: 'No standard licence declared',
    commercial,
    redistribution: 'unknown',
    sourceUrl: 'https://github.com/example/simply-buttons',
    note: '',
  },
  variants: [],
});

const card = (commercial: string) =>
  render(
    <ComponentCard
      asset={asset(commercial)}
      href="/browse/assets?id=simply-buttons%2Farttech-download"
      onOpen={() => {}}
      providerName="Simply Buttons"
      categoryLabel="Buttons"
      saved={false}
    />,
  );

it('labels a component with no commercial licence as Licence unknown, never Free', () => {
  card('unknown');
  expect(screen.getByText('Licence unknown')).toBeTruthy();
  expect(screen.queryByText('Free')).toBeNull();
});

it('labels a commercially licensed component Free', () => {
  card('allowed');
  expect(screen.getByText('Free')).toBeTruthy();
  expect(screen.queryByText('Licence unknown')).toBeNull();
});
