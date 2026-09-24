import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Thumbnail } from './Thumbnail';
import type { CandidateListing } from '../lib/candidates';
import type { Density } from '../hooks/useDensity';

type CandidateCardProps = {
  listing: CandidateListing;
  onSelectCategory: (category: string) => void;
  onSelectFormat: (format: string) => void;
};

export function CandidateCard({ listing, onSelectCategory, onSelectFormat }: CandidateCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const format = listing.formats[0];

  return (
    <article>
      <a
        className="preview-link"
        href={listing.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${listing.name}`}
      >
        {imageFailed ? (
          <span className="preview-fallback" aria-hidden="true">
            {listing.name.charAt(0)}
          </span>
        ) : (
          <Thumbnail
            id={listing.id}
            alt={`${listing.name} website preview`}
            sizes="(max-width: 767px) 100vw, (max-width: 1000px) 50vw, 33vw"
            onError={() => setImageFailed(true)}
          />
        )}
      </a>

      <div className="card-heading">
        <a href={listing.url} target="_blank" rel="noopener noreferrer">
          {listing.name}
        </a>
        <div className="card-actions">
          <a
            className="visit"
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${listing.name} website`}
          >
            <ArrowUpRight size={17} />
          </a>
        </div>
      </div>

      {listing.description ? <p className="card-description">{listing.description}</p> : null}

      <div className="metadata">
        <span className={`pricing pricing-${listing.pricing.toLowerCase()}`}>
          {listing.pricing}
        </span>
        {listing.source ? (
          <>
            <span>·</span>
            {listing.sourceHref ? (
              <a href={listing.sourceHref} target="_blank" rel="noopener noreferrer">
                {listing.source}
              </a>
            ) : (
              <span>{listing.source}</span>
            )}
          </>
        ) : null}
      </div>

      <div className="resource-tags">
        <button type="button" onClick={() => onSelectCategory(listing.category)}>
          {listing.category}
        </button>
        {format ? (
          <button type="button" onClick={() => onSelectFormat(format)}>
            {format}
          </button>
        ) : null}
      </div>
    </article>
  );
}

type CandidateGridProps = {
  listings: CandidateListing[];
  density: Density;
  onSelectCategory: (category: string) => void;
  onSelectFormat: (format: string) => void;
};

export function CandidateGrid({
  listings,
  density,
  onSelectCategory,
  onSelectFormat,
}: CandidateGridProps) {
  return (
    <section className={`website-grid density-${density}`} aria-label="Staged candidates">
      {listings.map((listing) => (
        <CandidateCard
          key={listing.id}
          listing={listing}
          onSelectCategory={onSelectCategory}
          onSelectFormat={onSelectFormat}
        />
      ))}
    </section>
  );
}
