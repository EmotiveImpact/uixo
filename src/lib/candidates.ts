import scoutFile from '../../data/uixo-candidates.json';
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
  /** Source posts the scout harvested from, when the file recorded them. */
  harvest_posts?: string[];
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

/** Scout notes sometimes say "Open source" for a free listing. That is still Free. */
function normaliseAccessToken(token: string): 'Free' | 'Paid' | null {
  const value = token.trim().toLowerCase();
  if (value === 'free' || value === 'open source' || value === 'opensource') return 'Free';
  if (value === 'paid') return 'Paid';
  return null;
}

/** "Free + Paid" in the scout's vocabulary is what the site calls Freemium. */
export function accessToPricing(access: string[] | undefined): Pricing | null {
  if (!Array.isArray(access) || access.length === 0) return null;
  const known = [
    ...new Set(
      access.map(normaliseAccessToken).filter((token): token is 'Free' | 'Paid' => token !== null),
    ),
  ].sort();
  if (!known.length) return null;
  return PRICING[known.join(',')] ?? null;
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

/**
 * A staged candidate shaped like a directory listing so the public preview can reuse
 * browse filters and cards. This is display-only — it does not write resources.json.
 */
export type CandidateListing = Resource & {
  source?: string;
  sourceHref: string | null;
  imageStatus?: string;
};

/** First recorded source post, or a handle we can turn into an X profile. */
export function candidateSourceHref(candidate: Candidate): string | null {
  const post = candidate.harvest_posts?.find((entry) => /^https?:\/\//i.test(entry));
  if (post) return post;

  const fromSource = candidate.source?.match(/https?:\/\/[^\s)]+/)?.[0];
  if (fromSource) return fromSource.replace(/[.,;]+$/, '');

  const handle = candidate.source?.trim();
  if (handle && /^[A-Za-z0-9_]{1,30}$/.test(handle)) return `https://x.com/${handle}`;
  return null;
}

/**
 * Every scout row, including ones already live. The public preview is a scan of the
 * staged file, not the curator queue — `importCandidates` still drops duplicates for /review.
 */
export function toCandidateListings(
  file: CandidateFile,
  checkedOn: string = file.updated ?? '1970-01-01',
): CandidateListing[] {
  return (file.items ?? []).flatMap((item, index) => {
    if (!item?.id || !item.url) return [];
    const pricing = accessToPricing(item.access) ?? 'Free';
    return [
      {
        id: item.id,
        name: item.name,
        description: (item.why ?? '').trim(),
        category: item.category,
        subcategory: item.subcategory,
        tags: item.tags ?? [],
        pricing,
        creator: item.creator?.trim() || item.name,
        formats: item.formats ?? [],
        aliases: [],
        addedOrder: item.addedOrder ?? index + 1,
        // Featured would otherwise hide the whole preview: these are not editor picks.
        featured: true,
        url: item.url,
        lastChecked: checkedOn,
        source: item.source,
        sourceHref: candidateSourceHref(item),
        imageStatus: item.image_status,
      },
    ];
  });
}

/** The staged scout file, imported so `/candidates` can browse it without a network fetch. */
export const candidateFile = scoutFile as CandidateFile;
export const candidateListings = toCandidateListings(candidateFile);
export const candidateFormats = [
  ...new Set(candidateListings.flatMap((entry) => entry.formats)),
].sort();
