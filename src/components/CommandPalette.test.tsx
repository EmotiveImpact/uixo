import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registryRequest } from '../lib/asset-library';
import { openSearchPalette } from '../lib/search-palette';
import { CommandPalette } from './CommandPalette';

vi.mock('../lib/asset-library', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/asset-library')>()),
  registryRequest: vi.fn(),
}));

const request = vi.mocked(registryRequest);
const shimmer = {
  id: 'magic-ui/shimmer-button',
  providerId: 'magic-ui',
  slug: 'shimmer-button',
  name: 'Shimmer Button',
  description: '',
  kind: 'component',
  category: 'buttons',
  price: 'free',
  tags: [],
  sourceUrl: 'https://magicui.design',
  verifiedAt: null,
  preview: null,
  licence: {
    expression: 'MIT',
    commercial: 'allowed',
    redistribution: '',
    sourceUrl: '',
    note: '',
  },
  variants: [],
};

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  cleanup();
  request.mockReset();
  vi.useRealTimers();
});

const press = () => fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

async function search(text: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Search UIXO' }), {
    target: { value: text },
  });
  await act(async () => {
    vi.advanceTimersByTime(200);
  });
}

describe('CommandPalette', () => {
  it('opens on Ctrl+K over the current page without navigating', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog', { name: 'Search UIXO' })).toBeNull();
    press();
    expect(screen.getByRole('dialog', { name: 'Search UIXO' })).toBeTruthy();
    expect(window.location.pathname).toBe('/');
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Search UIXO' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens from a header control and starts with categories and collections', () => {
    render(<CommandPalette />);
    act(() => openSearchPalette());
    expect(screen.getByRole('group', { name: 'Popular categories' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Collections' })).toBeTruthy();
  });

  it('lists components first, then websites, and opens a component on Enter', async () => {
    vi.useFakeTimers();
    request.mockResolvedValue({ items: [shimmer], total: 1, nextOffset: null });
    render(<CommandPalette />);
    press();
    await search('button');

    expect(request).toHaveBeenCalledWith(
      'search',
      expect.objectContaining({
        query: expect.objectContaining({ q: 'button', kind: 'component' }),
      }),
    );
    const groups = screen
      .getAllByRole('group')
      .map((group) => group.getAttribute('aria-labelledby'));
    const titles = groups.map((id) => document.getElementById(id!)?.textContent);
    expect(titles[0]).toBe('Components');
    if (titles.includes('Websites'))
      expect(titles.indexOf('Websites')).toBeGreaterThan(titles.indexOf('Components'));
    expect(
      within(screen.getByRole('group', { name: 'Components' })).getByRole('option', {
        name: /Shimmer Button/,
      }),
    ).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(window.location.pathname).toBe('/browse/assets');
    expect(new URLSearchParams(window.location.search).get('id')).toBe('magic-ui/shimmer-button');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers a full search and top categories when nothing matches', async () => {
    vi.useFakeTimers();
    request.mockResolvedValue({ items: [], total: 0, nextOffset: null });
    render(<CommandPalette />);
    press();
    await search('zzqxv');

    expect(screen.getByText('No component or website called “zzqxv”.')).toBeTruthy();
    expect(screen.getByRole('option', { name: /Search all components for “zzqxv”/ })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Top categories' })).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(window.location.pathname).toBe('/browse/assets');
    expect(new URLSearchParams(window.location.search).get('q')).toBe('zzqxv');
  });

  it('leaves the shortcut alone while another dialog is open', () => {
    const other = document.createElement('dialog');
    other.setAttribute('open', '');
    document.body.append(other);
    render(<CommandPalette />);
    press();
    expect(screen.queryByRole('dialog', { name: 'Search UIXO' })).toBeNull();
    other.remove();
  });
});
