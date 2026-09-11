import { categories, resources } from '../data';
import type { Pricing, Resource } from '../types';

/** A staged listing from the scout. Not live until a human approves it. */
export type Candidate = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  tags: string[];
  /** The scout's shape: ["Free"], ["Paid"] or ["Free","Paid"]. Mapped to `pricing` on approval. */
  access: string[];
  creator?: string;
  formats: string[];
  url: string;
  why: string;
  needs_review?: boolean;
  image_status?: string;
  source?: string;
  addedOrder?: number;
};

export type CandidateFile = {
  updated?: string;
  counts_by_category?: Record<string, number>;
  items: Candidate[];
};

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

/** A reviewer's decision, plus whatever they changed before making it. */
export type Review = {
  status: ReviewStatus;
  /** Field-level overrides applied on top of the candidate. */
  edits: Partial<Candidate> & { description?: string };
  reason?: string;
  decidedBy: string | null;
  decidedAt: string;
};

export type ImportProblem = {
  id: string;
  field: string;
  message: string;
};

export type ImportResult = {
  accepted: Candidate[];
  /** Rejected before review: already live, or duplicated within the file. */
  duplicates: ImportProblem[];
  /** Accepted but flagged: the reviewer has to fix these before approving. */
  problems: ImportProblem[];
};

/** Compare links by what they actually point at, not how they were typed. */
export function normaliseUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

const PRICING: Record<string, Pricing> = {
  Free: 'Free',
  Paid: 'Paid',
  'Free,Paid': 'Freemium',
  'Paid,Free': 'Freemium',
};

/** "Free + Paid" in the scout's vocabulary is what the site calls Freemium. */
export function accessToPricing(access: string[] | undefined): Pricing | null {
  if (!Array.isArray(access) || access.length === 0) return null;
  return PRICING[[...access].sort().join(',')] ?? null;
}

function subcategoriesFor(category: string): string[] | null {
  return categories.find((entry) => entry.name === category)?.sub ?? null;
}

/**
 * Reads a scout file, drops anything already live or repeated inside the file, and flags
 * the rest for the reviewer. Nothing here decides whether a listing is any good — that is
 * the reviewer's job, and the whole point of the queue.
 */
export function importCandidates(file: CandidateFile, live: Resource[] = resources): ImportResult {
  const accepted: Candidate[] = [];
  const duplicates: ImportProblem[] = [];
  const problems: ImportProblem[] = [];

  const liveUrls = new Set(live.map((entry) => normaliseUrl(entry.url)));
  const liveIds = new Set(live.map((entry) => entry.id));
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();

  for (const item of file.items ?? []) {
    if (!item?.id || !item.url) {
      duplicates.push({ id: item?.id ?? '(no id)', field: 'id', message: 'Missing id or url' });
      continue;
    }

    const url = normaliseUrl(item.url);

    if (liveUrls.has(url) || liveIds.has(item.id)) {
      duplicates.push({ id: item.id, field: 'url', message: 'Already listed on the site' });
      continue;
    }
    if (seenUrls.has(url) || seenIds.has(item.id)) {
      duplicates.push({ id: item.id, field: 'url', message: 'Repeated within this file' });
      continue;
    }

    seenUrls.add(url);
    seenIds.add(item.id);
    accepted.push(item);

    const subs = subcategoriesFor(item.category);
    if (!subs) {
      problems.push({
        id: item.id,
        field: 'category',
        message: `Unknown category "${item.category}"`,
      });
    } else if (!subs.includes(item.subcategory)) {
      problems.push({
        id: item.id,
        field: 'subcategory',
        message: `"${item.subcategory}" is not under ${item.category}`,
      });
    }

    if (!accessToPricing(item.access)) {
      problems.push({
        id: item.id,
        field: 'access',
        message: 'Cannot map access to a pricing tier',
      });
    }
    if (!item.why?.trim()) {
      problems.push({ id: item.id, field: 'why', message: 'No reason given' });
    }
  }

  return { accepted, duplicates, problems };
}

/** The candidate as the reviewer has left it, edits applied. */
export function withEdits(
  candidate: Candidate,
  review?: Review,
): Candidate & { description?: string } {
  return { ...candidate, ...(review?.edits ?? {}) };
}

/**
 * Turn an approved candidate into a row for src/content/resources.json.
 *
 * `description` is the reviewer's, not the scout's: `why` is a research note and reads
 * like one, so it seeds the field and has to be rewritten before approval.
 */
export function toResource(
  candidate: Candidate & { description?: string },
  addedOrder: number,
  checkedOn: string,
): Resource | null {
  const pricing = accessToPricing(candidate.access);
  if (!pricing) return null;

  return {
    id: candidate.id,
    name: candidate.name,
    description: (candidate.description ?? candidate.why ?? '').trim(),
    category: candidate.category,
    subcategory: candidate.subcategory,
    tags: candidate.tags ?? [],
    pricing,
    creator: candidate.creator?.trim() || candidate.name,
    formats: candidate.formats ?? [],
    aliases: [],
    addedOrder,
    featured: false,
    url: candidate.url,
    lastChecked: checkedOn,
  };
}

/** Approved rows, numbered after whatever is already live so "Recent" stays truthful. */
export function toResourceRows(
  approved: (Candidate & { description?: string })[],
  live: Resource[] = resources,
  checkedOn: string = new Date().toISOString().slice(0, 10),
): Resource[] {
  let next = Math.max(0, ...live.map((entry) => entry.addedOrder));
  return approved
    .map((candidate) => toResource(candidate, ++next, checkedOn))
    .filter((row): row is Resource => row !== null);
}
