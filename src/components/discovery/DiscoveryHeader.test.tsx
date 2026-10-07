import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiscoveryHeader } from './DiscoveryHeader';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('Discovery header', () => {
  it('restores the original plain spaced wordmark without a replacement symbol', () => {
    render(<DiscoveryHeader active="discover" light={false} onToggleTheme={vi.fn()} />);
    const wordmark = screen.getByRole('link', { name: 'UIXO home' });
    expect(wordmark.textContent?.trim()).toBe('UIXO');
    expect(wordmark.classList.contains('brand')).toBe(true);
    expect(wordmark.querySelector('svg, .wordmark-dot')).toBeNull();
  });

  it('keeps the top level to Browse, Collections and For developers', () => {
    render(<DiscoveryHeader active="discover" light={false} onToggleTheme={vi.fn()} />);
    const main = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(main).getByRole('button', { name: 'Browse' })).toBeTruthy();
    expect(
      within(main)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Collections', 'For developersMCP']);
  });

  it('links Templates to the actual resource directory and marks it selected', () => {
    window.history.replaceState(null, '', '/category/templates');
    render(<DiscoveryHeader active="resources" light={false} onToggleTheme={vi.fn()} />);
    const browse = screen.getByRole('button', { name: 'Browse' });
    expect(browse.hasAttribute('data-active')).toBe(true);
    fireEvent.click(browse);
    const menu = screen.getByRole('region', { name: 'Browse UIXO' });
    const templates = within(menu).getByRole('link', { name: /^Templates/ });
    expect(templates.getAttribute('href')).toBe('/category/templates');
    expect(templates.getAttribute('aria-current')).toBe('page');
    expect(
      within(menu)
        .getByRole('link', { name: /^All resources/ })
        .hasAttribute('aria-current'),
    ).toBe(false);
  });

  it('keeps Fonts as a first-class asset destination and marks it selected', () => {
    window.history.replaceState(null, '', '/browse/assets?kind=font');
    render(<DiscoveryHeader active="components" light={false} onToggleTheme={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Browse' }));
    const menu = screen.getByRole('region', { name: 'Browse UIXO' });
    const fonts = within(menu).getByRole('link', { name: 'Fonts' });
    expect(fonts.getAttribute('href')).toBe('/browse/assets?kind=font');
    expect(fonts.getAttribute('aria-current')).toBe('page');
    expect(
      within(menu).getByRole('link', { name: 'Components' }).hasAttribute('aria-current'),
    ).toBe(false);
  });

  it('closes the Browse menu on Escape and returns focus to its trigger', () => {
    render(<DiscoveryHeader active="discover" light={false} onToggleTheme={vi.fn()} />);
    const browse = screen.getByRole('button', { name: 'Browse' });
    fireEvent.click(browse);
    expect(browse.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Browse UIXO' })).toBeNull();
    expect(document.activeElement).toBe(browse);
  });

  it('closes the mobile navigation on Escape and returns focus to its trigger', () => {
    render(<DiscoveryHeader active="discover" light={false} onToggleTheme={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const navigation = screen.getByRole('navigation', { name: 'Mobile navigation' });
    within(navigation).getByRole('link', { name: 'Components' }).focus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open menu' }));
  });
});
