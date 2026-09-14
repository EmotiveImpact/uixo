import { useCallback, useEffect, useMemo, useState } from 'react';
import { importCandidates, withEdits } from '../lib/candidates';
import type {
  Candidate,
  CandidateFile,
  ImportProblem,
  Review,
  ReviewStatus,
} from '../lib/candidates';
import { readStored, writeStored, CANDIDATES_KEY, REVIEWS_KEY } from '../lib/storage';

export type QueueState = {
  candidates: Candidate[];
  reviews: Record<string, Review>;
  problems: ImportProblem[];
  duplicates: ImportProblem[];
  importedAt: string | null;
};

const EMPTY: QueueState = {
  candidates: [],
  reviews: {},
  problems: [],
  duplicates: [],
  importedAt: null,
};

/**
 * The review queue's state. Decisions are kept separately from the candidates so that
 * re-importing an updated scout file never silently discards work already done.
 */
export function useReviewQueue(reviewerId: string | null) {
  const [state, setState] = useState<QueueState>(() => {
    const storedCandidates = readStored<Candidate[]>(CANDIDATES_KEY, []);
    const { accepted, problems, duplicates } = importCandidates({ items: storedCandidates });

    return {
      ...EMPTY,
      candidates: accepted,
      reviews: readStored<Record<string, Review>>(REVIEWS_KEY, {}),
      problems,
      duplicates,
    };
  });

  useEffect(() => {
    writeStored(CANDIDATES_KEY, state.candidates);
  }, [state.candidates]);

  useEffect(() => {
    writeStored(REVIEWS_KEY, state.reviews);
  }, [state.reviews]);

  const load = useCallback((file: CandidateFile) => {
    const { accepted, problems, duplicates } = importCandidates(file);
    setState((current) => ({
      // Decisions survive a re-import; only the candidate rows are replaced.
      reviews: current.reviews,
      candidates: accepted,
      problems,
      duplicates,
      importedAt: new Date().toISOString(),
    }));
  }, []);

  const decide = useCallback(
    (ids: string[], status: ReviewStatus, reason?: string) => {
      setState((current) => {
        const reviews = { ...current.reviews };
        for (const id of ids) {
          reviews[id] = {
            status,
            edits: reviews[id]?.edits ?? {},
            reason: reason ?? reviews[id]?.reason,
            decidedBy: reviewerId,
            decidedAt: new Date().toISOString(),
          };
        }
        return { ...current, reviews };
      });
    },
    [reviewerId],
  );

  /** Editing a decided item returns it to the queue: the decision was made on old text. */
  const edit = useCallback((id: string, patch: Partial<Candidate> & { description?: string }) => {
    setState((current) => {
      const existing = current.reviews[id];
      return {
        ...current,
        reviews: {
          ...current.reviews,
          [id]: {
            status: existing?.status === 'approved' ? 'pending' : (existing?.status ?? 'pending'),
            edits: { ...(existing?.edits ?? {}), ...patch },
            reason: existing?.reason,
            decidedBy: existing?.decidedBy ?? null,
            decidedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  const reset = useCallback(() => setState({ ...EMPTY }), []);

  const statusOf = useCallback(
    (id: string): ReviewStatus => state.reviews[id]?.status ?? 'pending',
    [state.reviews],
  );

  const counts = useMemo(() => {
    const tally: Record<ReviewStatus, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      skipped: 0,
    };
    for (const candidate of state.candidates) tally[statusOf(candidate.id)] += 1;
    return tally;
  }, [state.candidates, statusOf]);

  const approved = useMemo(
    () =>
      state.candidates
        .filter((candidate) => statusOf(candidate.id) === 'approved')
        .map((candidate) => withEdits(candidate, state.reviews[candidate.id])),
    [state.candidates, state.reviews, statusOf],
  );

  const problemsFor = useCallback(
    (id: string) => state.problems.filter((problem) => problem.id === id),
    [state.problems],
  );

  return { state, load, decide, edit, reset, statusOf, counts, approved, problemsFor };
}
