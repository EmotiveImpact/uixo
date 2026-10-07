import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CandidateCard, CandidateGrid } from './CandidateGrid';
import type { CandidateListing } from '../lib/candidates';

afterEach(() => {
  cleanup();
});

const listing = (over: Partial<CandidateListing> = {}): CandidateListing => ({
  id: 'navbar-gallery',
  name: 'Navbar Gallery',
  description: 'Curated navbar / navigation design inspiration',
  category: 'Components',
  subcategory: 'Navigation',
  tags: ['Navigation'],
  pricing: 'Free',
  creator: 'navbar.gallery',
  formats: ['Web'],
  aliases: [],
  addedOrder: 1,
  featured: true,
  url: 'https://navbar.gallery',
  lastChecked: '2026-09-24',
  source: 'Manixh02',
  sourceHref: 'https://x.com/Manixh02',
  imageStatus: 'captured',
  ...over,
});

describe('CandidateCard', () => {
  it('links the thumb and name out to the destination, not an in-app listing', () => {
    render(
      <CandidateCard listing={listing()} onSelectCategory={vi.fn()} onSelectFormat={vi.fn()} />,
    );
    const visit = screen.getByRole('link', { name: 'Visit Navbar Gallery' });
    expect(visit.getAttribute('href')).toBe('https://navbar.gallery');
    expect(visit.getAttribute('target')).toBe('_blank');
    expect(screen.getByRole('link', { name: 'Navbar Gallery' }).getAttribute('href')).toBe(
      'https://navbar.gallery',
    );
  });

  it('shows category, pricing, and a source post when one exists', () => {
    render(
      <CandidateCard listing={listing()} onSelectCategory={vi.fn()} onSelectFormat={vi.fn()} />,
    );
    expect(screen.getByText('Free')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Components' })).toBeTruthy();
    const source = screen.getByRole('link', { name: 'Manixh02' });
    expect(source.getAttribute('href')).toBe('https://x.com/Manixh02');
  });

  it('filters by category when the chip is pressed', () => {
    const onSelectCategory = vi.fn();
    render(
      <CandidateCard
        listing={listing()}
        onSelectCategory={onSelectCategory}
        onSelectFormat={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Components' }));
    expect(onSelectCategory).toHaveBeenCalledWith('Components');
  });
});

describe('CandidateGrid', () => {
  it('renders every listing passed to it', () => {
    render(
      <CandidateGrid
        listings={[
          listing(),
          listing({ id: 'supahero', name: 'Supahero', url: 'https://supahero.io' }),
        ]}
        density="comfortable"
        onSelectCategory={vi.fn()}
        onSelectFormat={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Staged candidates').querySelectorAll('article')).toHaveLength(2);
  });
});
