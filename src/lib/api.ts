import { auth } from './auth';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function request<T>(
  path: string,
  init: RequestInit = {},
  withToken = false,
): Promise<ApiResult<T>> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');

  // Fetched per request: these expire in minutes, so caching one would mostly mean
  // presenting a stale one.
  const token = withToken ? await auth.apiToken() : null;
  if (token) headers.set('authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch {
    // Offline, blocked, or no API deployed: callers decide whether to fall back.
    return { ok: false, error: 'Could not reach the server.', status: 0 };
  }

  const body = await response.json().catch(() => ({}) as Record<string, unknown>);
  if (!response.ok) {
    const error = typeof body.error === 'string' ? body.error : 'Something went wrong.';
    return { ok: false, error, status: response.status };
  }
  return { ok: true, data: body as T };
}

export const api = {
  submit: (input: { name: string; url: string; note: string }) =>
    request<{ id?: string; duplicate?: boolean }>('/api/submissions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listSubmissions: () => request<{ submissions: ServerSubmission[] }>('/api/submissions', {}, true),

  setSubmissionStatus: (id: string, status: 'approved' | 'declined' | 'pending') =>
    request<{ id: string }>(
      '/api/submissions',
      {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      },
      true,
    ),

  report: (resourceId: string, reason: string) =>
    request<{ recorded: boolean }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify({ resourceId, reason }),
    }),

  listReports: () => request<{ reports: ServerReport[] }>('/api/reports', {}, true),

  resolveReport: (resourceId: string) =>
    request<{ resolved: boolean }>(
      '/api/reports',
      {
        method: 'PATCH',
        body: JSON.stringify({ resourceId }),
      },
      true,
    ),
};

export type ServerSubmission = {
  id: string;
  name: string;
  url: string;
  note: string;
  status: 'pending' | 'approved' | 'declined';
  submitted_at: string;
  reviewed_at: string | null;
};

export type ServerReport = {
  id: string;
  resource_id: string;
  reason: string;
  reported_at: string;
  name: string;
  url: string;
};
