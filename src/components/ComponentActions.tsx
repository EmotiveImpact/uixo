import { ArrowUpRight, Bookmark, BookmarkCheck, Check, Code2, Terminal } from 'lucide-react';
import { useState } from 'react';
import { registryRequest, safeAssetUrl } from '../lib/asset-library';
import type { Acquisition, AssetRecord } from '../lib/asset-library';
import { assetDestinationUrl } from '../lib/asset-destination';
import { commandText, forPackageManager, readPackageManager } from '../lib/package-manager';

type Props = {
  asset: AssetRecord;
  saved?: boolean;
  onToggleSave?: () => void;
};

/**
 * Copy install, save and open the source straight from a card, so the commonest jobs
 * no longer need the detail view. Shown on hover and always on touch screens.
 */
export function ComponentActions({ asset, saved = false, onToggleSave }: Props) {
  const [state, setState] = useState<'idle' | 'copying' | 'copied' | 'none'>('idle');
  const destination = assetDestinationUrl(asset);
  const installable = ['registry', 'package'].includes(asset.variants[0]?.acquisition?.kind ?? '');
  const code = safeAssetUrl(asset.sourceUrl);

  async function copyInstall() {
    setState('copying');
    try {
      const variant = asset.variants[0];
      const result = await registryRequest<Acquisition>('resolve', {
        body: { id: asset.id, variantId: variant?.id },
      });
      const command = commandText(result);
      if (!command) {
        setState('none');
      } else {
        await navigator.clipboard.writeText(forPackageManager(command, readPackageManager()));
        setState('copied');
      }
    } catch {
      setState('none');
    }
    window.setTimeout(() => setState('idle'), 1800);
  }

  return (
    <div className="component-actions">
      {asset.kind === 'component' && !installable && code && (
        <a href={code} target="_blank" rel="noopener noreferrer" title="Read the source code">
          <Code2 size={15} />
          <span>View code</span>
        </a>
      )}
      {asset.kind === 'component' && installable && (
        <button
          onClick={() => void copyInstall()}
          disabled={state === 'copying'}
          aria-label={`Copy install command for ${asset.name}`}
          title="Copy install command"
        >
          {state === 'copied' ? <Check size={15} /> : <Terminal size={15} />}
          <span>
            {state === 'copied'
              ? 'Copied'
              : state === 'none'
                ? 'See source'
                : state === 'copying'
                  ? 'Copying…'
                  : 'Copy install'}
          </span>
        </button>
      )}
      {onToggleSave && (
        <button
          className="component-action-icon"
          aria-pressed={saved}
          aria-label={saved ? `Unsave ${asset.name}` : `Save ${asset.name}`}
          title={saved ? 'Saved' : 'Save'}
          onClick={onToggleSave}
        >
          {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>
      )}
      {destination && (
        <a
          className="component-action-icon"
          href={destination}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${asset.name} source`}
          title="Open the original"
        >
          <ArrowUpRight size={15} />
        </a>
      )}
    </div>
  );
}
