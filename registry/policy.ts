import { KIBO_REVIEWED_COMPONENTS } from '../shared/reviewed-previews.ts';
import { timingSafeEqual } from 'node:crypto';
import { type Asset, type Variant, RegistryError, record, strings, text } from './domain.ts';

const packageName = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
export function tokenMatches(supplied: string, expected: string | undefined): boolean {
  if (!expected || expected.length < 24) return false;
  const a = Buffer.from(supplied),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function selectVariant(asset: Asset, variantId?: string): Variant {
  const variant = variantId ? asset.variants.find((v) => v.id === variantId) : asset.variants[0];
  if (!variant) throw new RegistryError('NOT_FOUND', 'Variant not found.', 404);
  return variant;
}
export function resolveAsset(asset: Asset, variantId?: string) {
  const variant = selectVariant(asset, variantId),
    acquisition = variant.acquisition;
  const external = ['external', 'purchase'].includes(acquisition.kind);
  const base = {
    assetId: asset.id,
    variantId: variant.id,
    kind: acquisition.kind,
    sourceUrl: asset.sourceUrl,
    licence: {
      expression: asset.licence.expression,
      sourceUrl: asset.licence.sourceUrl,
      commercial: asset.licence.commercial,
      redistribution: asset.licence.redistribution,
      attribution: asset.licence.attribution,
      note: asset.licence.note,
    },
    requiresApproval: true,
    executed: false,
    mirrored: false,
    sourceRef: variant.sourceRef,
  };
  if (external)
    return {
      ...base,
      status: 'external',
      url: acquisition.url,
      command: null,
      message:
        asset.kind === 'icon-pack'
          ? 'Browse and choose icons on the official library website.'
          : 'Complete any purchase or authorisation at the original provider.',
    };
  if (asset.licence.redistribution !== 'allowed' || !asset.licence.checkedAt || !asset.licence.text)
    return {
      ...base,
      status: 'blocked',
      url: asset.sourceUrl,
      command: null,
      message:
        'Licence evidence does not authorise automated retrieval. Review the original source.',
    };
  const checked = Date.parse(asset.licence.checkedAt);
  if (!Number.isFinite(checked) || Date.now() - checked > 1000 * 60 * 60 * 24 * 90)
    return {
      ...base,
      status: 'blocked',
      url: asset.sourceUrl,
      command: null,
      message: 'Licence verification is stale. Re-index and review before acquisition.',
    };
  const url = new URL(acquisition.url);
  if (acquisition.kind === 'registry') {
    const registrySources: Record<string, { origin: string; path: string }> = {
      'kibo-ui': { origin: 'https://www.kibo-ui.com', path: '/r/' },
      shadcn: { origin: 'https://ui.shadcn.com', path: '/r/' },
      'magic-ui': { origin: 'https://magicui.design', path: '/r/' },
      'motion-primitives': { origin: 'https://motion-primitives.com', path: '/c/' },
    };
    if (
      asset.providerId === 'kibo-ui' &&
      (!Object.hasOwn(KIBO_REVIEWED_COMPONENTS, asset.slug) ||
        acquisition.url !== `https://www.kibo-ui.com/r/${asset.slug}.json`)
    )
      throw new RegistryError(
        'UNTRUSTED_SOURCE',
        'Kibo acquisition must match the exact reviewed component URL.',
        403,
      );
    const source = registrySources[asset.providerId];
    if (!source || url.origin !== source.origin || !url.pathname.startsWith(source.path))
      throw new RegistryError(
        'UNTRUSTED_SOURCE',
        'Registry is not in the approved acquisition allowlist.',
        403,
      );
  }
  if (
    acquisition.kind === 'direct' &&
    (url.origin !== 'https://raw.githubusercontent.com' ||
      !/^\/(lucide-icons\/lucide|tailwindlabs\/heroicons)\//.test(url.pathname))
  )
    throw new RegistryError('UNTRUSTED_SOURCE', 'Direct source is not approved.', 403);
  let command: { executable: string; arguments: string[] } | null = null;
  if (acquisition.kind === 'package') {
    if (!acquisition.packageName || !packageName.test(acquisition.packageName))
      throw new RegistryError('UNTRUSTED_PACKAGE', 'Package identifier is invalid.', 403);
    const allowed: Record<string, string> = {
      lucide: 'lucide-react',
      heroicons: '@heroicons/react',
    };
    if (allowed[asset.providerId] !== acquisition.packageName)
      throw new RegistryError('UNTRUSTED_PACKAGE', 'Package does not match this provider.', 403);
    command = {
      executable: 'npm',
      arguments: ['install', '--ignore-scripts', '--', acquisition.packageName],
    };
  }
  if (acquisition.kind === 'registry')
    command = { executable: 'npx', arguments: ['shadcn', 'add', acquisition.url] };
  return {
    ...base,
    status: 'ready',
    url: acquisition.url,
    command,
    message: command
      ? 'Review this instruction before running it. UIXO has not executed it; the upstream package or registry may have changed.'
      : 'Retrieve from the original source and retain its complete copyright and licence notices.',
  };
}

type Check = {
  dependency: string;
  status: 'satisfied' | 'missing' | 'conflict' | 'unknown';
  required: string;
  actual: string | null;
};
/** Deliberately conservative: unsupported range syntax returns unknown, never a guessed pass. */
export function satisfies(actual: string, range: string): boolean | null {
  const actualMatch = /^(\d+)\.(\d+)\.(\d+)$/.exec(actual);
  if (!actualMatch) return null;
  const v = actualMatch.slice(1).map(Number);
  const compare = (b: number[]) => v[0] - b[0] || v[1] - b[1] || v[2] - b[2];
  if (range === '*') return true;
  const alternatives = range.split('||').map((s) => s.trim());
  if (alternatives.length > 1) {
    const results = alternatives.map((r) => satisfies(actual, r));
    return results.includes(true) ? true : results.includes(null) ? null : false;
  }
  const conjunction = range.trim().split(/\s+/);
  if (conjunction.length > 1) {
    const results = conjunction.map((r) => satisfies(actual, r));
    return results.includes(false) ? false : results.includes(null) ? null : true;
  }
  const m = /^(\^|~|>=|<=|>|<|=)?(\d+)\.(\d+)\.(\d+)$/.exec(range.trim());
  if (!m) return null;
  const lower = m.slice(2).map(Number),
    op = m[1] ?? '=',
    cmp = compare(lower);
  if (op === '^') {
    const upper = lower[0]
      ? [lower[0] + 1, 0, 0]
      : lower[1]
        ? [0, lower[1] + 1, 0]
        : [0, 0, lower[2] + 1];
    return cmp >= 0 && compare(upper) < 0;
  }
  if (op === '~') return cmp >= 0 && compare([lower[0], lower[1] + 1, 0]) < 0;
  return op === '>='
    ? cmp >= 0
    : op === '<='
      ? cmp <= 0
      : op === '>'
        ? cmp > 0
        : op === '<'
          ? cmp < 0
          : cmp === 0;
}
export function checkCompatibility(asset: Asset, input: unknown, variantId?: string) {
  const variant = selectVariant(asset, variantId),
    project = record(input);
  const framework = text(project.framework, 40, true).toLowerCase();
  const installed = record(project.packages ?? {});
  if (Object.keys(installed).length > 200)
    throw new RegistryError('INVALID_INPUT', 'At most 200 installed packages are accepted.');
  const css = text(project.css, 60, true);
  const checks: Check[] = [];
  for (const [dependency, required] of Object.entries(variant.peerDependencies)) {
    const actual = installed[dependency] ? text(installed[dependency], 120) : null;
    const result = actual ? satisfies(actual, required) : null;
    checks.push({
      dependency,
      required,
      actual,
      status: !actual
        ? 'missing'
        : result === true
          ? 'satisfied'
          : result === false
            ? 'conflict'
            : 'unknown',
    });
  }
  const missing = strings(variant.dependencies).filter(
    (dependency) => !Object.hasOwn(installed, dependency),
  );
  const reasons: string[] = [];
  let status = 'unknown';
  if (framework && variant.framework !== 'agnostic' && framework !== variant.framework) {
    status = 'incompatible';
    reasons.push(`This variant targets ${variant.framework}, not ${framework}.`);
  } else if (checks.some((c) => c.status === 'conflict')) {
    status = 'incompatible';
    reasons.push('Declared peer dependency ranges conflict.');
  } else if (
    missing.length ||
    checks.some((c) => c.status === 'missing') ||
    (variant.css && css && variant.css !== css)
  ) {
    status = 'requires-change';
    reasons.push('Dependencies or styling setup require changes.');
  } else if (framework && checks.length && checks.every((c) => c.status === 'satisfied')) {
    status = 'declared-compatible';
    reasons.push('Declared framework and peer requirements match. This is not a runtime test.');
  } else {
    reasons.push('Available metadata is insufficient to certify runtime compatibility.');
  }
  if (!Object.keys(variant.peerDependencies).length)
    reasons.push('This source has not supplied verified version ranges for the variant.');
  return {
    assetId: asset.id,
    variantId: variant.id,
    status,
    reasons,
    missingDependencies: missing,
    checks,
    cssRequirement: variant.css,
    testedInProject: false,
    evidence: asset.evidence,
  };
}
