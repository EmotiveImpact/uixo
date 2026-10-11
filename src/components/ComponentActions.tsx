import { ArrowUpRight, Bookmark, Check, Copy, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { registryRequest, safeAssetUrl } from '../lib/asset-library';
import type { Acquisition, AssetRecord } from '../lib/asset-library';
import { assetDestinationUrl } from '../lib/asset-destination';
import {
  commandText,
  forPackageManager,
  installPreview,
  readPackageManager,
} from '../lib/package-manager';

const COPIED_FOR = 1600;

/**
 * Row three of a card: a quiet mono install line that copies the real command, which
 * comes from the registry's `resolve` request. Components without an install route
 * link to their code instead.
 */
export function InstallLine({ asset }: { asset: AssetRecord }) {
  const [state, setState] = useState<'idle' | 'copying' | 'copied' | 'failed'>('idle');
  const [announcement, setAnnouncement] = useState('');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const preview = installPreview(asset, readPackageManager());
  const code = safeAssetUrl(asset.sourceUrl);
  const destination = assetDestinationUrl(asset);

  if (!preview) {
    const href = asset.kind === 'component' ? (code ?? destination) : destination;
    if (!href) return null;
    const label =
      asset.kind === 'component'
        ? 'View code'
        : asset.kind === 'icon-pack'
          ? 'Browse icon pack'
          : 'Open the original';
    return (
      <a
        className="g-cmd"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} for ${asset.name} (opens in a new tab)`}
      >
        <code>
          {asset.kind === 'component' && <span className="g-cmd-prompt">&lt;/&gt; </span>}
          {label} ↗
        </code>
      </a>
    );
  }

  async function copyInstall() {
    window.clearTimeout(timer.current);
    setState('copying');
    let next: 'copied' | 'failed' = 'failed';
    try {
      const variant = asset.variants[0];
      const result = await registryRequest<Acquisition>('resolve', {
        body: { id: asset.id, variantId: variant?.id },
      });
      const command = commandText(result);
      if (command) {
        await navigator.clipboard.writeText(forPackageManager(command, readPackageManager()));
        next = 'copied';
      }
    } catch {
      next = 'failed';
    }
    setState(next);
    setAnnouncement(
      next === 'copied'
        ? `Install command for ${asset.name} copied`
        : 'The install command could not be copied. Open the component for its source.',
    );
    timer.current = window.setTimeout(() => {
      setState('idle');
      setAnnouncement('');
    }, COPIED_FOR);
  }

  return (
    <>
      <button
        type="button"
        className="g-cmd"
        data-state={state}
        onClick={() => void copyInstall()}
        aria-label={`Copy install command for ${asset.name}`}
        title={`Copy: ${preview}`}
      >
        <code>
          {state === 'copied' ? (
            'Copied'
          ) : state === 'failed' ? (
            'Could not copy, open the component for its source'
          ) : (
            <>
              <span className="g-cmd-prompt">$ </span>
              {preview}
            </>
          )}
        </code>
        {state === 'copied' ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}

/** Save sits on the stage corner as a glass button, always visible: hover never reaches it over a live frame. */
export function CardSaveButton({
  name,
  saved,
  onToggle,
}: {
  name: string;
  saved: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="g-save"
      aria-pressed={saved}
      aria-label={saved ? `Unsave ${name}` : `Save ${name}`}
      title={saved ? 'Saved' : 'Save'}
      onClick={onToggle}
    >
      <Bookmark size={15} aria-hidden="true" fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}

/** "Visit {name} ↗" for website and library cards. */
export function VisitLine({ href, name }: { href: string; name: string }) {
  return (
    <a className="g-visit" href={href} target="_blank" rel="noopener noreferrer">
      <Globe size={14} aria-hidden="true" />
      <span>Visit {name}</span>
      <ArrowUpRight size={13} aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
