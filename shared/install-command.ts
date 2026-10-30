/**
 * The one install command builder. The registry's `resolve` (detail page, card copy and the
 * MCP `resolve_asset` and `acquire_asset` tools) and the card's listing-only preview all build
 * their string here, so the card can never show or copy a different command from the one the
 * detail page reviews.
 *
 * Package installs keep the reviewed, safer form: `npm install --ignore-scripts -- <name>`.
 * `--ignore-scripts` stops install hooks from running and `--` stops a name being read as a flag.
 */
export type InstallCommand = { executable: string; arguments: string[] };
export type InstallAcquisition = { kind: string; url?: string; packageName?: string };

/** Build the reviewed command for an acquisition, or null when it has no install route. */
export function installCommand(
  acquisition: InstallAcquisition | null | undefined,
): InstallCommand | null {
  if (acquisition?.kind === 'package' && acquisition.packageName)
    return {
      executable: 'npm',
      arguments: ['install', '--ignore-scripts', '--', acquisition.packageName],
    };
  if (acquisition?.kind === 'registry' && acquisition.url)
    return { executable: 'npx', arguments: ['shadcn', 'add', acquisition.url] };
  return null;
}

/** Shell text for a command, quoting each argument only when the shell would split or expand it. */
export function formatCommand(command: InstallCommand | null | undefined): string {
  if (!command) return '';
  return [command.executable, ...command.arguments]
    .map((part) =>
      /^[a-zA-Z0-9@/.:_=-]+$/.test(part) ? part : `'${part.replaceAll("'", "'\\''")}'`,
    )
    .join(' ');
}

/**
 * A shortened form of the identical string for narrow places such as a card: only the origin
 * and directories of a registry URL are elided, so `npx shadcn add https://x.dev/r/a.json`
 * reads `npx shadcn add …/a.json`. Every other command is returned unchanged.
 */
export function abbreviateCommand(text: string): string {
  return text.replace(/(^|\s)https:\/\/\S*\/([^/\s]+)(?=\s|$)/g, '$1…/$2');
}
