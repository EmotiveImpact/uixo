import { readStored, writeStored, REPORTS_KEY, SUGGESTIONS_KEY } from './storage';

export type SubmissionStatus = 'pending' | 'approved' | 'declined';

export type Submission = {
  id: string;
  name: string;
  url: string;
  note: string;
  status: SubmissionStatus;
  submittedAt: string;
  submittedBy: string | null;
};

export type LinkReport = {
  resourceId: string;
  reason: string;
  reportedAt: string;
  reportedBy: string | null;
  resolved: boolean;
};

/**
 * Submissions and reports are kept in the visitor's own browser until a backend exists.
 * Everything the app does with them goes through this module, so replacing localStorage
 * with API calls means changing these functions and nothing else.
 */
export function loadSubmissions(): Submission[] {
  return readStored<Submission[]>(SUGGESTIONS_KEY, []);
}

export function addSubmission(
  input: { name: string; url: string; note: string },
  submittedBy: string | null,
): Submission[] {
  const submission: Submission = {
    id: `s_${Date.now().toString(36)}`,
    name: input.name.trim(),
    url: input.url.trim(),
    note: input.note.trim(),
    status: 'pending',
    submittedAt: new Date().toISOString(),
    submittedBy,
  };
  const next = [...loadSubmissions(), submission];
  return writeStored(SUGGESTIONS_KEY, next) ? next : loadSubmissions();
}

export function setSubmissionStatus(id: string, status: SubmissionStatus): Submission[] {
  const next = loadSubmissions().map((entry) => (entry.id === id ? { ...entry, status } : entry));
  writeStored(SUGGESTIONS_KEY, next);
  return next;
}

export function loadReports(): LinkReport[] {
  const stored = readStored<unknown[]>(REPORTS_KEY, []);
  // The first version stored bare resource ids; keep those readable.
  return stored.map((entry) =>
    typeof entry === 'string'
      ? {
          resourceId: entry,
          reason: 'Reported before reasons were recorded',
          reportedAt: '',
          reportedBy: null,
          resolved: false,
        }
      : (entry as LinkReport),
  );
}

export function addReport(
  resourceId: string,
  reason: string,
  reportedBy: string | null,
): LinkReport[] {
  const next = [
    ...loadReports().filter((entry) => entry.resourceId !== resourceId || entry.resolved),
    { resourceId, reason, reportedAt: new Date().toISOString(), reportedBy, resolved: false },
  ];
  writeStored(REPORTS_KEY, next);
  return next;
}

export function resolveReport(resourceId: string): LinkReport[] {
  const next = loadReports().map((entry) =>
    entry.resourceId === resourceId ? { ...entry, resolved: true } : entry,
  );
  writeStored(REPORTS_KEY, next);
  return next;
}

/** Listings whose link has not been verified within `days`. */
export function staleResources<T extends { id: string; name: string; lastChecked: string }>(
  resources: T[],
  days = 90,
  now = new Date(),
): T[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return resources.filter((resource) => {
    const checked = new Date(`${resource.lastChecked}T00:00:00Z`).getTime();
    return Number.isNaN(checked) || checked < cutoff;
  });
}
