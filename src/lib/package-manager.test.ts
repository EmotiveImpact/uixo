import { describe, expect, it } from 'vitest';
import {
  commandText,
  forPackageManager,
  hasPackageManagerVariants,
  installPreview,
} from './package-manager';

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

  it('shortens a registry command to its component name', () => {
    expect(installPreview(registry)).toBe('npx shadcn add …/shimmer-button');
    expect(installPreview(registry, 'pnpm')).toBe('pnpm dlx shadcn add …/shimmer-button');
  });

  it('shows the package for a package install', () => {
    expect(
      installPreview({
        variants: [{ acquisition: { kind: 'package', packageName: 'flowbite-react' } }],
      }),
    ).toBe('npm install flowbite-react');
  });

  it('is empty when there is no install route', () => {
    expect(installPreview({ variants: [{ acquisition: { kind: 'external' } }] })).toBe('');
    expect(installPreview({ variants: [] })).toBe('');
  });
});
