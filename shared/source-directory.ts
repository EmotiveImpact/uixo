import type { SourceHealth } from './intelligence';

/** Null evidence means not assessed, never zero coverage. assetCount is an exact SQL count. */
export type SourceSummary = Omit<SourceHealth, 'metrics'> & {
  assetCount: number;
  metrics: SourceHealth['metrics'] | null;
  evidenceStatus: 'complete' | 'deferred';
  evidenceNote: string | null;
};

export type SourceDirectoryResult = {
  items: SourceSummary[];
  total: number;
  offset: number;
  limit: number;
  nextOffset: number | null;
  generatedAt: string;
};
