import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CONNECT_CLIENTS, TRY_ASKING } from '../lib/connect-clients';
import { ConnectAgent } from './ConnectAgent';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const endpoint = `${window.location.origin}/api/mcp`;

it('offers one tab per client, starting with Claude Code', () => {
  render(<ConnectAgent />);
  const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
  expect(tabs).toEqual(['Claude Code', 'Cursor', 'VS Code', 'Windsurf']);
  expect(screen.getByRole('tab', { name: 'Claude Code' }).getAttribute('aria-selected')).toBe(
    'true',
  );
  expect(screen.getByRole('tabpanel').textContent).toContain(
    `claude mcp add --transport http uixo ${endpoint}`,
  );
});

it('shows each editor its own config block and moves between tabs with the arrow keys', () => {
  render(<ConnectAgent />);
  fireEvent.click(screen.getByRole('tab', { name: 'Cursor' }));
  const code = screen.getByRole('tabpanel').querySelector('code')!.textContent!;
  expect(JSON.parse(code)).toEqual({ mcpServers: { uixo: { url: endpoint } } });

  fireEvent.keyDown(screen.getByRole('tab', { name: 'Cursor' }), { key: 'ArrowRight' });
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'VS Code' }));
  expect(screen.getByRole('tabpanel').textContent).toContain('.vscode/mcp.json');
  const vscode = screen.getByRole('tabpanel').querySelector('code')!.textContent!;
  expect(JSON.parse(vscode)).toEqual({ servers: { uixo: { type: 'http', url: endpoint } } });
  fireEvent.keyDown(screen.getByRole('tab', { name: 'VS Code' }), { key: 'End' });
  expect(screen.getByRole('tab', { name: 'Windsurf' }).getAttribute('aria-selected')).toBe('true');
  const windsurf = screen.getByRole('tabpanel').querySelector('code')!.textContent!;
  expect(JSON.parse(windsurf)).toEqual({ mcpServers: { uixo: { serverUrl: endpoint } } });
});

it('copies the block for the chosen client', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  render(<ConnectAgent />);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy the Claude Code setup' }));
  });
  expect(writeText).toHaveBeenCalledWith(`claude mcp add --transport http uixo ${endpoint}`);
  expect(screen.getByText('Copied.')).toBeTruthy();
});

it('lists the example prompts, then the tools and the local setup, collapsed', () => {
  const { container } = render(<ConnectAgent />);
  for (const prompt of TRY_ASKING) expect(screen.getByText(prompt)).toBeTruthy();
  const sections = [...container.querySelectorAll('details')];
  expect(sections.map((entry) => entry.querySelector('summary')!.textContent)).toEqual([
    'What your agent can do',
    'Run it yourself',
  ]);
  expect(sections.every((entry) => !entry.open)).toBe(true);
  expect(sections[0].textContent).toContain('search_assets');
  expect(sections[1].textContent).toContain('npm run registry:mcp');
  expect(sections[1].textContent).toContain('Vercel');
  // No flags beyond the documented transport option.
  expect(CONNECT_CLIENTS[0].snippet('https://x.test/api/mcp')).toBe(
    'claude mcp add --transport http uixo https://x.test/api/mcp',
  );
});
