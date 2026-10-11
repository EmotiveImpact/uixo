import { abbreviateCommand, formatCommand, installCommand } from '../../shared/install-command';
import type { InstallAcquisition } from '../../shared/install-command';
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

/** The exact shell text of a resolved command, from the shared builder's formatter. */
export function commandText(result: Acquisition | undefined | null): string {
  return formatCommand(result?.command);
}

type InstallableAsset = {
  variants: { acquisition?: InstallAcquisition | null }[];
};

/**
 * The full install command for a listing, built by the same shared builder as the registry's
 * `resolve`, so it is the identical string the detail page shows and the card copies.
 * Empty when the asset has no install route.
 */
export function installCommandText(
  asset: InstallableAsset,
  manager: PackageManager = 'npm',
): string {
  const text = formatCommand(installCommand(asset.variants[0]?.acquisition));
  return text ? forPackageManager(text, manager) : '';
}

/**
 * The card's install line: a shortened form of `installCommandText`, built from the listing
 * alone so a card can show it without a request. Only a registry URL's origin and folders are
 * elided; flags such as `--ignore-scripts` are never dropped.
 */
export function installPreview(asset: InstallableAsset, manager: PackageManager = 'npm'): string {
  return abbreviateCommand(installCommandText(asset, manager));
}
