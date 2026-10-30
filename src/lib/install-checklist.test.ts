import { describe, expect, it } from 'vitest';
import { installChecklist, installPrerequisite } from './install-checklist';
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

describe('the line under the install command', () => {
  const text = (parts: ReturnType<typeof installPrerequisite>) =>
    parts?.map((part) => (typeof part === 'string' ? part : `\`${part.code}\``)).join('');
  const result = (args: string[]) => ({
    status: 'ready',
    message: '',
    url: '',
    executed: false,
    command: { executable: 'npx', arguments: args },
  });

  it('names the shadcn prerequisite and says UIXO has not run the command', () => {
    expect(text(installPrerequisite(undefined, result(['shadcn', 'add', 'x'])))).toBe(
      'Needs shadcn set up (`components.json`). UIXO has not run this command.',
    );
  });

  it('names peers for a package install', () => {
    expect(
      text(
        installPrerequisite(
          {
            id: 'v',
            framework: 'react',
            format: 'tsx',
            css: null,
            dependencies: [],
            peerDependencies: { react: '^19' },
            acquisition: { kind: 'package', packageName: 'flowbite-react' },
          },
          result(['install', 'flowbite-react']),
        ),
      ),
    ).toBe('Needs `react` in your project. UIXO has not run this command.');
  });

  it('says nothing when there is no command', () => {
    expect(installPrerequisite(undefined, undefined)).toBeNull();
  });
});
