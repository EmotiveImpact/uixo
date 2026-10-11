import { useEffect, useState } from 'react';
import type { CandidateListing } from '../lib/candidates';

export type CandidateCatalogue = {
  listings: CandidateListing[];
  formats: string[];
};

/** Loads the staged scout listings the first time `/candidates` is visited, then keeps them. */
export function useCandidateCatalogue(enabled: boolean): CandidateCatalogue | null {
  const [catalogue, setCatalogue] = useState<CandidateCatalogue | null>(null);

  useEffect(() => {
    if (!enabled || catalogue) return;
    let cancelled = false;
    void import('../lib/candidateCatalogue').then((module) => {
      if (!cancelled) {
        setCatalogue({ listings: module.candidateListings, formats: module.candidateFormats });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, catalogue]);

  return catalogue;
}
