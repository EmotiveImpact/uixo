import type { Acquisition } from './asset-library';

export const PACKAGE_MANAGERS = ['npm', 'pnpm', 'bun', 'yarn'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

const KEY = 'uixo-package-manager';
const RUNNER = /^npx (?:-y |--yes )?/;
const INSTALL = /^npm (?:install|i|add) /;

export function readPackageManager(): PackageManager {
  try {
    const value = localStorage.getItem(KEY);
    return PACKAGE_MANAGERS.find((entry) => entry === value) ?? 'npm';
  } catch {
    return 'npm';
  }
}

export function writePackageManager(manager: PackageManager) {
  try {
    localStorage.setItem(KEY, manager);
  } catch {
    // Storage can be blocked; the choice then lasts for this page only.
  }
}

/** True when the command is an npm runner or install that other managers can express. */
export function hasPackageManagerVariants(command: string): boolean {
  return RUNNER.test(command) || INSTALL.test(command);
}

/** Rewrite an npm-flavoured command for the chosen package manager. */
export function forPackageManager(command: string, manager: PackageManager): string {
  if (manager === 'npm') return command;
  const runner = RUNNER.exec(command);
  if (runner) {
    const rest = command.slice(runner[0].length);
    return { pnpm: `pnpm dlx ${rest}`, bun: `bunx --bun ${rest}`, yarn: `yarn dlx ${rest}` }[
      manager
    ];
  }
  const install = INSTALL.exec(command);
  if (install) {
    const rest = command.slice(install[0].length);
    return { pnpm: `pnpm add ${rest}`, bun: `bun add ${rest}`, yarn: `yarn add ${rest}` }[manager];
  }
  return command;
}

/** Quote each argument only when the shell would otherwise split or expand it. */
export function commandText(result: Acquisition | undefined | null): string {
  if (!result?.command) return '';
  return [result.command.executable, ...result.command.arguments]
    .map((part) =>
      /^[a-zA-Z0-9@/.:_=-]+$/.test(part) ? part : `'${part.replaceAll("'", "'\\''")}'`,
    )
    .join(' ');
}

type InstallableAsset = {
  variants: { acquisition?: { kind: string; url?: string; packageName?: string } | null }[];
};

/**
 * A short, readable stand-in for an install command, built from the listing alone so a
 * card can show it without a request. The real command still comes from `resolve`.
 * Empty when the asset has no install route.
 */
export function installPreview(asset: InstallableAsset, manager: PackageManager = 'npm'): string {
  const acquisition = asset.variants[0]?.acquisition;
  if (acquisition?.kind === 'registry' && acquisition.url) {
    const name = acquisition.url
      .split(/[?#]/)[0]
      .split('/')
      .pop()
      ?.replace(/\.json$/, '');
    return name ? forPackageManager(`npx shadcn add …/${name}`, manager) : '';
  }
  if (acquisition?.kind === 'package' && acquisition.packageName)
    return forPackageManager(`npm install ${acquisition.packageName}`, manager);
  return '';
}
