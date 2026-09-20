/** Serialisable contracts shared by the browser, registry and bounded operators. */
export type Freshness = 'fresh' | 'ageing' | 'stale' | 'unknown';
export type EvidenceMetrics = {
  total: number;
  sourcePinned: number;
  licenceEvidence: number;
  commercialAllowed: number;
  acquisitionReady: number;
  dependenciesDeclared: number;
  compatibilityDeclared: number;
  officialCaptures: number;
  pinnedLiveDemos: number;
  upstreamImages: number;
  missingPreviews: number;
  fresh: number;
  ageing: number;
  stale: number;
  unknown: number;
};
export type SourceHealth = {
  id: string;
  name: string;
  url: string;
  rationale: string;
  metrics: EvidenceMetrics;
  frameworks: string[];
  formats: string[];
  licences: string[];
  oldestVerifiedAt: string | null;
  newestVerifiedAt: string | null;
  upstreamStatus: 'not-checked';
};
export type CoverageReport = {
  generatedAt: string;
  policy: {
    freshDays: number;
    staleDays: number;
    thinCategoryBelow: number;
    maximumAssets: number;
  };
  metrics: EvidenceMetrics;
  sources: SourceHealth[];
  categories: {
    id: string;
    label: string;
    assets: number;
    providers: number;
    state: 'empty' | 'thin' | 'covered';
  }[];
  gaps: { code: string; label: string; count: number; providerId?: string }[];
  duplicateSources: { sourceUrl: string; assetIds: string[] }[];
  upstreamStatus: 'not-checked';
};
export type CollectionItem = { kind: 'asset' | 'provider'; targetId: string; note: string };
export type CollectionInput = {
  slug: string;
  title: string;
  description: string;
  items: CollectionItem[];
};
export type CollectionRecord = CollectionInput & {
  revision: number;
  publishedRevision: number | null;
  hasUnpublishedChanges: boolean;
  updatedAt: string;
};
export type CollectionAssetPreview = {
  id: string;
  providerId: string;
  name: string;
  kind: string;
  sourceUrl: string;
  preview: { kind: 'image' | 'embed'; url?: string; label: string } | null;
};
export type PublicCollectionItem = CollectionItem & {
  name: string;
  sourceUrl: string;
  providerId?: string;
  providerName?: string;
  frameworks?: string[];
  licenceExpression?: string;
  asset?: CollectionAssetPreview;
};
export type PublicCollection = Omit<CollectionInput, 'items'> & {
  items: PublicCollectionItem[];
  revision: number;
  unavailableItems: number;
};
export type PipelineStage =
  'discovered' | 'investigating' | 'review' | 'published' | 'rejected' | 'blocked';
export type CandidateSummary = {
  id: string;
  name: string;
  url: string;
  note: string;
  source: string;
  postUrl: string | null;
  createdAt: string;
  providerId: string | null;
  revision: number;
  reason: string;
  stage: PipelineStage;
  pending: number;
  approved: number;
  rejected: number;
  live: number;
  activeJobs: number;
  failedJobs: number;
  completedJobs: number;
};
export type OperationJob = {
  id: string;
  provider_id: string;
  status: string;
  attempts: number;
  stats: {
    nextOffset?: number | null;
    staged?: number;
    duplicates?: number;
    sourceRef?: string | null;
  };
  error: string | null;
};
export type OperationsReport = {
  totals: Record<PipelineStage, number>;
  total: number;
  offset: number;
  nextOffset: number | null;
  items: CandidateSummary[];
  jobs: OperationJob[];
  readOnly: boolean;
};
export type CandidateDetail = {
  candidate: CandidateSummary;
  jobs: OperationJob[];
  revisions: { id: string; assetId: string; name: string; status: string; reason: string }[];
  revisionTotal: number;
  deliveries: { repository: string; issueNumber: number; receivedAt: string }[];
  history: { actor: string; action: string; detail: string; created_at: string }[];
};
