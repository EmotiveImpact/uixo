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

  it('links Templates to the actual resource directory and marks it selected', () => {
    window.history.replaceState(null, '', '/category/templates');
    render(<DiscoveryHeader active="resources" light={false} onToggleTheme={vi.fn()} />);
    const templates = screen.getByRole('link', { name: 'Templates' });
    expect(templates.getAttribute('href')).toBe('/category/templates');
    expect(templates.getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Resources' }).hasAttribute('aria-current')).toBe(
      false,
    );
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
