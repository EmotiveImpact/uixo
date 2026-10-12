import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { DiscoveryControls } from './TopBar';

afterEach(cleanup);

it('filters components on commercial use instead of a price that every component shares', () => {
  const onChange = vi.fn();
  render(
    <DiscoveryControls
      assetSearch
      catalogue="assets"
      searchRef={createRef<HTMLInputElement>()}
      search=""
      onSearchChange={() => {}}
      price="All"
      onPriceChange={() => {}}
      commercial={{ value: false, onChange }}
    />,
  );
  expect(screen.queryByRole('radio', { name: 'Paid' })).toBeNull();
  const filter = screen.getByRole('button', { name: 'Commercial use allowed' });
  expect(filter.getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(filter);
  expect(onChange).toHaveBeenCalledWith(true);
});

it('keeps the pricing switch for websites', () => {
  render(
    <DiscoveryControls
      searchRef={createRef<HTMLInputElement>()}
      search=""
      onSearchChange={() => {}}
      price="All"
      onPriceChange={() => {}}
    />,
  );
  expect(screen.getByLabelText('Pricing')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Commercial use allowed' })).toBeNull();
});
