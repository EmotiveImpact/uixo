import { beforeEach, describe, expect, it } from 'vitest';
import {
  addReport,
  addSubmission,
  loadReports,
  loadSubmissions,
  resolveReport,
  setSubmissionStatus,
  staleResources,
} from './submissions';
import { REPORTS_KEY } from './storage';

describe('submissions', () => {
  beforeEach(() => localStorage.clear());

  it('records a submission as pending', () => {
    const next = addSubmission({ name: 'Thing', url: 'https://x.dev', note: 'good' }, 'u_a');
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ name: 'Thing', status: 'pending', submittedBy: 'u_a' });
  });

  it('trims what it stores', () => {
    const [entry] = addSubmission({ name: '  Thing  ', url: ' https://x.dev ', note: '' }, null);
    expect(entry.name).toBe('Thing');
    expect(entry.url).toBe('https://x.dev');
  });

  it('moves a submission through review', () => {
    const [entry] = addSubmission({ name: 'Thing', url: 'https://x.dev', note: '' }, null);
    expect(setSubmissionStatus(entry.id, 'approved')[0].status).toBe('approved');
    expect(loadSubmissions()[0].status).toBe('approved');
  });

  it('keeps anonymous submissions distinguishable from signed-in ones', () => {
    addSubmission({ name: 'A', url: 'https://a.dev', note: '' }, null);
    addSubmission({ name: 'B', url: 'https://b.dev', note: '' }, 'u_b');
    expect(loadSubmissions().map((entry) => entry.submittedBy)).toEqual([null, 'u_b']);
  });
});

describe('link reports', () => {
  beforeEach(() => localStorage.clear());

  it('records and resolves a report', () => {
    addReport('lucide', '404', 'u_a');
    expect(loadReports()[0]).toMatchObject({ resourceId: 'lucide', resolved: false });
    expect(resolveReport('lucide')[0].resolved).toBe(true);
  });

  it('does not stack duplicate open reports for one resource', () => {
    addReport('lucide', 'first', null);
    addReport('lucide', 'second', null);
    expect(loadReports().filter((entry) => !entry.resolved)).toHaveLength(1);
  });

  it('keeps a resolved report when a new one arrives', () => {
    addReport('lucide', 'first', null);
    resolveReport('lucide');
    addReport('lucide', 'again', null);
    expect(loadReports()).toHaveLength(2);
  });

  it('reads the original bare-id format', () => {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(['ui8']));
    expect(loadReports()[0]).toMatchObject({ resourceId: 'ui8', resolved: false });
  });
});

describe('staleResources', () => {
  const now = new Date('2026-09-10T00:00:00Z');
  const make = (id: string, lastChecked: string) => ({ id, name: id, lastChecked });

  it('flags listings past the cutoff', () => {
    const stale = staleResources([make('a', '2026-01-01'), make('b', '2026-09-01')], 90, now);
    expect(stale.map((entry) => entry.id)).toEqual(['a']);
  });

  it('flags an unparseable date rather than silently passing it', () => {
    expect(staleResources([make('a', 'nonsense')], 90, now)).toHaveLength(1);
  });
});
