import { ArrowUpRight, RotateCcw } from 'lucide-react';
import type { MouseEvent } from 'react';
import { providerPageFromId } from '../lib/asset-destination';

type LoadErrorProps = {
  /** One component (detail) or a list of them. */
  subject: 'component' | 'components';
  onRetry: () => void;
  /** The technical reason, kept behind Details for whoever runs the site. */
  details?: string;
  /** An asset id such as "magic-ui/shimmer-button": offers the provider's own page. */
  assetId?: string;
  browseHref?: string;
  onBrowse?: (event: MouseEvent<HTMLAnchorElement>) => void;
  /** The detail page has no other heading when it fails, so it needs the page's h1. */
  headingLevel?: 'h1' | 'h2';
};

/** One error for list, detail and Home: what happened, that the link is fine, what to do. */
export function LoadError({
  subject,
  onRetry,
  details,
  assetId,
  browseHref = '/browse/assets?kind=component',
  onBrowse,
  headingLevel: Heading = 'h2',
}: LoadErrorProps) {
  const provider = assetId ? providerPageFromId(assetId) : null;
  return (
    <section className="load-error" role="alert">
      <Heading className="load-error-title">
        {subject === 'component'
          ? 'We could not load this component.'
          : 'We could not load these components.'}
      </Heading>
      <p className="load-error-body">Your link is fine. Try again in a moment.</p>
      <div className="load-error-actions">
        <button type="button" className="load-error-retry" onClick={onRetry}>
          <RotateCcw size={15} aria-hidden="true" />
          Try again
        </button>
        {provider && (
          <a
            className="load-error-provider"
            href={provider.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on {provider.name}
            <ArrowUpRight size={15} aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
        <a className="load-error-browse" href={browseHref} onClick={onBrowse}>
          Browse components
        </a>
      </div>
      {details && (
        <details className="load-error-details">
          <summary>Details</summary>
          <p>{details}</p>
        </details>
      )}
    </section>
  );
}
