import { describe, expect, it } from 'vitest';
import {
  commandText,
  forPackageManager,
  hasPackageManagerVariants,
  installCommandText,
  installPreview,
} from './package-manager';
import { resolveAsset } from '../../registry/policy.ts';
import type { Asset } from '../../registry/domain.ts';

describe('package manager commands', () => {
  const add = 'npx shadcn@latest add https://magicui.design/r/aurora-text.json';

  it('rewrites an npx runner for each manager', () => {
    expect(forPackageManager(add, 'npm')).toBe(add);
    expect(forPackageManager(add, 'pnpm')).toBe(
      'pnpm dlx shadcn@latest add https://magicui.design/r/aurora-text.json',
    );
    expect(forPackageManager(add, 'bun')).toBe(
      'bunx --bun shadcn@latest add https://magicui.design/r/aurora-text.json',
    );
    expect(forPackageManager(add, 'yarn')).toBe(
      'yarn dlx shadcn@latest add https://magicui.design/r/aurora-text.json',
    );
  });

  it('rewrites an npm install and leaves anything else alone', () => {
    expect(forPackageManager('npm install -D motion', 'pnpm')).toBe('pnpm add -D motion');
    expect(forPackageManager('npm i motion', 'bun')).toBe('bun add motion');
    expect(forPackageManager('git clone x', 'yarn')).toBe('git clone x');
    expect(hasPackageManagerVariants('git clone x')).toBe(false);
    expect(hasPackageManagerVariants('npx -y shadcn add x')).toBe(true);
  });

  it('quotes only the arguments that need it', () => {
    expect(
      commandText({
        status: 'ok',
        message: '',
        url: '',
        executed: false,
        command: { executable: 'npx', arguments: ['shadcn', 'add', "it's here"] },
      }),
    ).toBe("npx shadcn add 'it'\\''s here'");
    expect(commandText(null)).toBe('');
  });
});

describe('install preview on cards', () => {
  const registry = {
    variants: [
      { acquisition: { kind: 'registry', url: 'https://magicui.design/r/shimmer-button.json' } },
    ],
  };

  it('elides only the registry URL folders of the full command', () => {
    expect(installCommandText(registry)).toBe(
      'npx shadcn add https://magicui.design/r/shimmer-button.json',
    );
    expect(installPreview(registry)).toBe('npx shadcn add …/shimmer-button.json');
    expect(installPreview(registry, 'pnpm')).toBe('pnpm dlx shadcn add …/shimmer-button.json');
  });

  it('keeps the reviewed flags for a package install', () => {
    const asset = {
      variants: [{ acquisition: { kind: 'package', packageName: 'flowbite-react' } }],
    };
    expect(installPreview(asset)).toBe('npm install --ignore-scripts -- flowbite-react');
    expect(installPreview(asset, 'pnpm')).toBe('pnpm add --ignore-scripts -- flowbite-react');
  });

  it('is empty when there is no install route', () => {
    expect(installPreview({ variants: [{ acquisition: { kind: 'external' } }] })).toBe('');
    expect(installPreview({ variants: [] })).toBe('');
  });
});

describe('one command builder (L-5)', () => {
  const asset = (providerId: string, acquisition: Asset['variants'][number]['acquisition']) =>
    ({
      id: `${providerId}/thing`,
      providerId,
      slug: 'thing',
      name: 'Thing',
      description: '',
      kind: 'component',
      tags: [],
      price: 'free',
      sourceUrl: 'https://example.com/thing',
      licence: {
        id: 'mit',
        expression: 'MIT',
        sourceUrl: 'https://example.com/licence',
        text: 'MIT licence text',
        commercial: 'allowed',
        redistribution: 'allowed',
        attribution: true,
        checkedAt: new Date().toISOString(),
        note: '',
      },
      variants: [
        {
          id: `${providerId}/thing/react`,
          framework: 'react',
          format: 'tsx',
          css: null,
          dependencies: [],
          peerDependencies: {},
          sourceRef: null,
          acquisition,
        },
      ],
      evidence: [],
      verifiedAt: null,
      preview: null,
      editorialPick: false,
    }) satisfies Asset;

  it.each([
    asset('flowbite-react', {
      kind: 'package',
      url: 'https://www.npmjs.com/package/flowbite-react',
      packageName: 'flowbite-react',
    }),
    asset('magic-ui', { kind: 'registry', url: 'https://magicui.design/r/shimmer-button.json' }),
  ])('the card shows and copies the string the detail page reviews for $providerId', (record) => {
    const resolved = resolveAsset(record);
    const detail = commandText(resolved);
    expect(detail).not.toBe('');
    expect(resolved.commandText).toBe(detail);
    expect(installCommandText(record)).toBe(detail);
    for (const manager of ['npm', 'pnpm', 'bun', 'yarn'] as const)
      expect(installCommandText(record, manager)).toBe(forPackageManager(detail, manager));
  });
});
