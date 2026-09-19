import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminDashboard } from './AdminDashboard';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(value: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => value,
  };
}

it('loads live admin queues and persists submission decisions', async () => {
  const requests: { url: string; method: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      requests.push({ url, method });
      if (url.includes('/api/auth/get-session'))
        return jsonResponse({
          user: { id: 'admin-1', email: 'emotiveimpact@gmail.com', role: 'curator' },
          session: { token: 'admin-token' },
        });
      if (url.includes('/api/auth/token')) return jsonResponse({ token: 'admin-token' });
      if (url === '/api/submissions' && method === 'GET')
        return jsonResponse({
          submissions: [
            {
              id: 'sub-1',
              name: 'New directory',
              url: 'https://example.com',
              note: 'Useful source',
              status: 'pending',
              submitted_at: '2026-09-12',
              reviewed_at: null,
            },
          ],
        });
      if (url === '/api/submissions' && method === 'PATCH') return jsonResponse({ id: 'sub-1' });
      if (url === '/api/reports') return jsonResponse({ reports: [] });
      if (url.includes('action=status'))
        return jsonResponse({
          storage: 'postgres',
          readOnly: false,
          stats: { assets: 67, providers: 3 },
          role: 'curator',
          eveConfigured: true,
          searchMode: 'weighted-keyword',
        });
      if (url.includes('action=queue')) return jsonResponse({ items: [{ id: 'revision-1' }] });
      if (url.includes('action=jobs')) return jsonResponse({ items: [{ id: 'job-1' }] });
      throw new Error(`Unexpected request: ${url}`);
    }),
  );

  render(
    <AdminDashboard
      user={{ id: 'admin-1', name: 'Admin', email: 'emotiveimpact@gmail.com', role: 'curator' }}
      onOpenResource={() => {}}
      onOpenWebsiteReview={() => {}}
    />,
  );

  expect(await screen.findByText('67')).toBeTruthy();
  expect(screen.getAllByText('Connected')).toHaveLength(2);
  expect(screen.getByText('1 staged revisions')).toBeTruthy();

  fireEvent.click(screen.getByLabelText('Approve New directory'));
  await waitFor(() =>
    expect(requests).toContainEqual({ url: '/api/submissions', method: 'PATCH' }),
  );
  expect(screen.getByText('Nothing is waiting for review.')).toBeTruthy();
});
