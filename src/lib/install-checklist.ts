import type { Acquisition, AssetRecord } from './asset-library';

/** A checklist line as text and inline code, so the page can render it without HTML. */
export type ChecklistPart = string | { code: string };
export type ChecklistItem = { id: string; parts: ChecklistPart[] };

type Variant = AssetRecord['variants'][number];

const FRAMEWORKS: Record<string, string> = {
  react: 'React',
  vue: 'Vue',
  html: 'HTML',
  svelte: 'Svelte',
  angular: 'Angular',
};

export function frameworkLabel(variant: Pick<Variant, 'framework' | 'css'> | undefined): string {
  if (!variant) return '';
  const framework =
    variant.framework === 'agnostic'
      ? 'Any framework'
      : (FRAMEWORKS[variant.framework] ?? variant.framework);
  const css =
    variant.css === 'tailwind' ? 'Tailwind CSS' : variant.css === 'css' ? 'CSS' : variant.css;
  return css ? `${framework}, ${css}` : framework;
}

function list(names: string[]): ChecklistPart[] {
  return names.flatMap((name, index) => [
    ...(index === 0 ? [] : [index === names.length - 1 ? ' and ' : ', ']),
    { code: name },
  ]);
}

/**
 * What to know before installing, built only from the listing and the resolved
 * instruction: how it installs, what it pulls in, what it is built for and its licence.
 */
export function installChecklist(
  asset: Pick<AssetRecord, 'licence'> & { licence: { attribution?: boolean } },
  variant: Variant | undefined,
  result: Acquisition | undefined,
  providerName: string,
): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const command = result?.command;
  const acquisition = variant?.acquisition;
  if (command?.arguments[0] === 'shadcn')
    items.push({
      id: 'route',
      parts: [
        'Installs through the shadcn CLI, so your project needs a ',
        { code: 'components.json' },
        '.',
      ],
    });
  else if (acquisition?.kind === 'package' && acquisition.packageName)
    items.push({
      id: 'route',
      parts: ['Installs the ', { code: acquisition.packageName }, ' package.'],
    });
  else if (variant && !acquisition && result && !command)
    items.push({
      id: 'route',
      parts: [`No install command: copy the source from ${providerName}.`],
    });

  if (variant) {
    items.push(
      variant.dependencies.length
        ? { id: 'deps', parts: ['Also adds ', ...list(variant.dependencies), ' from npm.'] }
        : { id: 'deps', parts: ['Declares no other npm packages.'] },
    );
    if (variant.registryDependencies?.length)
      items.push({
        id: 'registry',
        parts: ['Brings in ', ...list(variant.registryDependencies), ' from the same registry.'],
      });
    const peers = Object.keys(variant.peerDependencies ?? {});
    if (peers.length)
      items.push({ id: 'peers', parts: ['Expects ', ...list(peers), ' in your project.'] });
    items.push({
      id: 'framework',
      parts: [
        variant.framework === 'agnostic'
          ? 'Works with any framework.'
          : `Built for ${frameworkLabel(variant).replace(', ', ' with ')}.`,
      ],
    });
  }

  const { expression, commercial, attribution } = asset.licence;
  if (commercial === 'allowed')
    items.push({
      id: 'licence',
      parts: [
        `${expression} licence allows commercial use.`,
        ...(attribution ? [' Keep the copyright notice with the code.'] : []),
      ],
    });
  return items;
}

/**
 * The one line under the install command: the main thing the project needs, and that UIXO
 * has not run the command. Built from the same data as the full checklist. Null when there
 * is no command to warn about.
 */
export function installPrerequisite(
  variant: Variant | undefined,
  result: Acquisition | undefined,
): ChecklistPart[] | null {
  const command = result?.command;
  if (!command) return null;
  const notRun = ' UIXO has not run this command.';
  if (command.arguments[0] === 'shadcn')
    return ['Needs shadcn set up (', { code: 'components.json' }, ').', notRun];
  const peers = Object.keys(variant?.peerDependencies ?? {});
  if (peers.length) return ['Needs ', ...list(peers), ' in your project.', notRun];
  const packageName = variant?.acquisition?.packageName;
  if (packageName) return ['Adds ', { code: packageName }, ' from npm.', notRun];
  return [notRun.trim()];
}
