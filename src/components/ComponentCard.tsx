import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { Info } from 'lucide-react';
import type { AssetRecord } from '../lib/asset-library';
import { isWarmHue, providerMark, stageHue } from '../lib/stage-hue';
import { licenceLabel } from '../lib/licence-label';
import { AssetPreview } from './AssetPreview';
import { CardSaveButton, InstallLine } from './ComponentActions';

/** An 18px square in the provider's own colour, before its name. */
export function ProviderMarkSquare({ id, name, size }: { id: string; name: string; size?: 'lg' }) {
  const mark = providerMark(id, name);
  return (
    <span
      className={`g-mark ${size === 'lg' ? 'is-lg' : ''} ${mark.glyph.length > 1 ? 'is-pair' : ''}`}
      aria-hidden="true"
      style={{ background: mark.background, color: mark.color }}
    >
      {mark.slash ? (
        <svg viewBox="0 0 16 16">
          <path
            d="M10 3.5 3.5 10M12.5 6 6 12.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        mark.glyph
      )}
    </span>
  );
}

/** A lit stage in one hue, with a soft spotlight from the top and a glow on the floor. */
export function TintedStage({
  hue,
  className = '',
  children,
}: {
  hue: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`g-stage g-tint ${isWarmHue(hue) ? 'is-warm' : ''} ${className}`}
      style={{ '--h': hue } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** "Free" in the card's price slot, or a quieter "Licence unknown" with an info mark. */
export function PriceLabel({ label }: { label: ReturnType<typeof licenceLabel> }) {
  if (label.settled) return <span className="g-price">{label.text}</span>;
  return (
    <span className="g-price is-unsettled" title={label.detail}>
      <Info size={13} aria-hidden="true" />
      {label.text}
    </span>
  );
}

const modified = (event: MouseEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

type ComponentCardProps = {
  asset: AssetRecord;
  href: string;
  onOpen: () => void;
  providerName: string;
  categoryLabel: string;
  saved: boolean;
  onToggleSave?: () => void;
  /** Just removed from saved: the card stays, dimmed, offering this Undo. */
  onUndoRemove?: () => void;
  /** Extra classes on the card and its name link, kept for older selectors and tests. */
  className?: string;
  linkClassName?: string;
  linkLabel?: string;
  heading?: 'h2' | 'h3';
};

/**
 * One card for every component grid: a lit 4:3 stage with the live demo, then the name
 * and price, the provider and category, and a quiet install line. The name is the link;
 * a click anywhere else on the chrome opens the same page.
 */
export function ComponentCard({
  asset,
  href,
  onOpen,
  providerName,
  categoryLabel,
  saved,
  onToggleSave,
  onUndoRemove,
  className = '',
  linkClassName = '',
  linkLabel,
  heading: Heading = 'h3',
}: ComponentCardProps) {
  const hue = stageHue(asset.id);
  const price = licenceLabel(asset);
  return (
    <article
      className={`g-card ${onUndoRemove ? 'is-removed' : ''} ${className}`}
      style={{ '--h': hue } as CSSProperties}
    >
      <TintedStage hue={hue}>
        <AssetPreview asset={asset} stage />
        {onToggleSave && <CardSaveButton name={asset.name} saved={saved} onToggle={onToggleSave} />}
      </TintedStage>
      <div
        className="g-meta"
        onClick={(event) => {
          const target = event.target as Element;
          if (modified(event) || target.closest('a, button')) return;
          onOpen();
        }}
      >
        <div className="g-head">
          <div className="g-r1">
            <Heading>
              <a
                className={`g-name ${linkClassName}`}
                href={href}
                aria-label={linkLabel}
                onClick={(event) => {
                  if (modified(event)) return;
                  event.preventDefault();
                  onOpen();
                }}
              >
                {asset.name}
              </a>
            </Heading>
            <PriceLabel label={price} />
          </div>
          <div className="g-r2">
            <ProviderMarkSquare id={asset.providerId} name={providerName} />
            <span className="g-provider">{providerName}</span>
            <span className="g-sep" aria-hidden="true">
              ›
            </span>
            <span>{categoryLabel}</span>
          </div>
        </div>
        <InstallLine asset={asset} />
      </div>
      {onUndoRemove && (
        <div className="g-removed">
          <span>Removed from saved.</span>
          <button type="button" onClick={onUndoRemove}>
            Undo
          </button>
        </div>
      )}
    </article>
  );
}
