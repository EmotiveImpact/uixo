import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AssetProvenance } from './AssetProvenance';
import type { AssetRecord } from '../lib/asset-library';

afterEach(cleanup);

function asset(sourceRef: string | null): AssetRecord {
  return {
    id: 'shadcn/card',
    providerId: 'shadcn',
    slug: 'card',
    name: 'Card',
    description: 'A source-backed card.',
    kind: 'component',
    price: 'free',
    tags: [],
    sourceUrl: 'https://ui.shadcn.com/docs/components/card',
    verifiedAt: '2026-09-12T12:00:00Z',
    preview: null,
    licence: {
      expression: 'MIT',
      commercial: 'allowed',
      redistribution: 'allowed',
      sourceUrl: 'https://github.com/shadcn-ui/ui/blob/main/LICENSE.md',
      note: 'Retain the original licence.',
    },
    variants: [{
      id: 'react-tsx',
      framework: 'react',
      format: 'tsx',
      dependencies: [],
      css: 'tailwind',
      sourceRef,
      registryDependencies: ['utils'],
      peerDependencies: { react: '^19.0.0' },
    }],
  };
}

it('shows an immutable source pin without claiming runtime certification', () => {
  render(<AssetProvenance asset={asset('a'.repeat(40))} variantId="react-tsx" providerName="shadcn/ui" />);
  expect(screen.getByText('Immutable commit')).toBeTruthy();
  expect(screen.getByTitle('a'.repeat(40)).textContent).toBe('a'.repeat(12));
  expect(screen.getByRole('link', { name: 'Source profile' }).getAttribute('href')).toContain('provider=shadcn');
  expect(screen.getByText(/not a security, accessibility or compatibility certification/)).toBeTruthy();
  expect(screen.getByText(/react \^19.0.0/)).toBeTruthy();
});

it('does not turn a mutable branch or a missing reference into a verified commit', () => {
  const mounted = render(<AssetProvenance asset={asset('main')} variantId="react-tsx" providerName="shadcn/ui" />);
  expect(screen.getByText('Declared reference')).toBeTruthy();
  expect(screen.queryByText('Immutable commit')).toBeNull();
  mounted.rerender(<AssetProvenance asset={asset(null)} variantId="react-tsx" providerName="shadcn/ui" />);
  expect(screen.getByText('Not pinned')).toBeTruthy();
  expect(screen.getByText('Unknown')).toBeTruthy();
});

it('keeps future verification dates unknown and unsafe licence links inert', () => {
  const record = asset(null);
  record.verifiedAt = '2999-01-01T00:00:00Z';
  record.licence.sourceUrl = 'javascript:alert(1)';
  render(<AssetProvenance asset={record} variantId="react-tsx" providerName="shadcn/ui" />);
  expect(screen.getByText('Not recorded')).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Original licence' })).toBeNull();
});
