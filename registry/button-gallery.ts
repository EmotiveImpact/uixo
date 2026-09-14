import { type Asset, type Provider, record, text, strings } from './domain.ts';

/** Snapshot metadata is read as data; upstream JavaScript is never evaluated by ingestion. */
export function buttonGalleryAsset(
  input: unknown,
  provider: Provider,
  ref: string,
  now: string,
  guidance: string,
): Asset {
  const row = record(input),
    slug = text(row.slug, 100);
  if (!/^[a-z0-9-]+$/.test(slug) || !/^[a-f0-9]{40}$/.test(ref))
    throw new Error('Invalid pinned gallery record');
  const sourcePath = text(row.sourcePath, 250);
  if (!/^src\/buttons\/[A-Za-z0-9-]+\.(jsx|tsx)$/.test(sourcePath))
    throw new Error('Invalid button source path');
  const sourceUrl = `https://github.com/${provider.repo}/blob/${ref}/${sourcePath}`;
  const evidenceUrl = `https://github.com/${provider.repo}/blob/${ref}/README.md`;
  return {
    id: `${provider.id}/${slug}`,
    providerId: provider.id,
    slug,
    name: text(row.name, 150),
    description: text(row.description, 1500),
    kind: 'component',
    category: 'buttons',
    tags: ['button', 'interaction', 'react', ...strings(row.tags).slice(0, 30)],
    price: 'free',
    sourceUrl,
    licence: {
      id: `${provider.id}-reuse-guidance`,
      expression: 'No standard licence declared',
      sourceUrl: evidenceUrl,
      text: guidance,
      commercial: 'unknown',
      redistribution: 'unknown',
      attribution: true,
      checkedAt: now,
      note: 'The original README invites copying and adapting gallery examples. No standard software licence or explicit commercial/redistribution terms were found in this source snapshot. Check the original guidance for your intended use.',
    },
    variants: [
      {
        id: `${provider.id}/${slug}/react`,
        framework: 'react',
        format: 'jsx',
        css: 'css',
        dependencies: strings(row.dependencies).slice(0, 20),
        peerDependencies: { react: '^19.1.1' },
        sourceRef: ref,
        acquisition: {
          kind: 'external',
          url: `${provider.url}?q=${encodeURIComponent(text(row.name, 150))}#${slug}`,
        },
      },
    ],
    evidence: [
      {
        field: 'original button implementation',
        url: sourceUrl,
        reference: ref,
        observedAt: now,
        method: 'inspected',
      },
      {
        field: 'copy and adaptation guidance',
        url: evidenceUrl,
        reference: ref,
        observedAt: now,
        method: 'declared',
      },
    ],
    verifiedAt: now,
    preview: null,
    editorialPick: false,
  };
}
