import { describe, expect, it } from 'vitest';
import { installChecklist } from './install-checklist';
import type { AssetRecord } from './asset-library';

const text = (items: ReturnType<typeof installChecklist>) =>
  items.map((item) =>
    item.parts.map((part) => (typeof part === 'string' ? part : `\`${part.code}\``)).join(''),
  );

const licence: AssetRecord['licence'] = {
  expression: 'MIT',
  commercial: 'allowed',
  attribution: true,
  redistribution: 'allowed',
  sourceUrl: '',
  note: '',
};

describe('before you install', () => {
  it('describes a shadcn registry install from the real instruction', () => {
    const lines = text(
      installChecklist(
        { licence },
        {
          id: 'v',
          framework: 'react',
          format: 'tsx',
          css: 'tailwind',
          dependencies: [],
          registryDependencies: ['button'],
          acquisition: { kind: 'registry', url: 'https://example.test/r/x.json' },
        },
        {
          status: 'ready',
          message: '',
          url: '',
          executed: false,
          command: { executable: 'npx', arguments: ['shadcn', 'add', 'https://example.test'] },
        },
        'Magic UI',
      ),
    );
    expect(lines).toEqual([
      'Installs through the shadcn CLI, so your project needs a `components.json`.',
      'Declares no other npm packages.',
      'Brings in `button` from the same registry.',
      'Built for React with Tailwind CSS.',
      'MIT licence allows commercial use. Keep the copyright notice with the code.',
    ]);
  });

  it('names packages and peers, and says nothing it does not know', () => {
    const lines = text(
      installChecklist(
        { licence: { ...licence, commercial: 'unknown' } },
        {
          id: 'v',
          framework: 'react',
          format: 'tsx',
          css: null,
          dependencies: ['motion', 'clsx'],
          peerDependencies: { react: '>=18' },
          acquisition: { kind: 'package', packageName: '@heroui/react' },
        },
        undefined,
        'HeroUI',
      ),
    );
    expect(lines).toEqual([
      'Installs the `@heroui/react` package.',
      'Also adds `motion` and `clsx` from npm.',
      'Expects `react` in your project.',
      'Built for React.',
    ]);
  });
});
