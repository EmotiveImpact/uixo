import { ArrowUpRight, Bookmark, BookmarkCheck, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Thumbnail } from './Thumbnail';
import { resources } from '../data';
import { newThreshold } from '../lib/freshness';
import type { Resource } from '../types';

const NEW_FROM = newThreshold(resources);

type ResourceCardProps = {
  resource: Resource;
  isSaved: boolean;
  href: string;
  onOpen: (id: string) => void;
  onToggleSaved: (id: string) => void;
  onSelectCategory: (category: string) => void;
};

export function ResourceCard({
  resource,
  isSaved,
  href,
  onOpen,
  onToggleSaved,
  onSelectCategory,
}: ResourceCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  // A real href keeps the card crawlable and middle-clickable; the handler keeps
  // in-app navigation from reloading the page.
  const open = (event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    onOpen(resource.id);
  };

  return (
    <article>
      <a
        className="preview-link"
        href={href}
        onClick={open}
        aria-label={`Open details for ${resource.name}`}
      >
        {imageFailed ? (
          <span className="preview-fallback" aria-hidden="true">
            {resource.name.charAt(0)}
          </span>
        ) : (
          <Thumbnail
            id={resource.id}
            alt={`${resource.name} website preview`}
            sizes="(max-width: 767px) 100vw, (max-width: 1000px) 50vw, 33vw"
            onError={() => setImageFailed(true)}
          />
        )}

        {resource.addedOrder >= NEW_FROM && <span className="card-badge">New</span>}
      </a>

      <div className="card-actions">
        <a
          className="visit"
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${resource.name} website`}
        >
          <ArrowUpRight size={16} />
        </a>
        <button
          className="save"
          aria-label={`${isSaved ? 'Remove' : 'Save'} ${resource.name} ${isSaved ? 'from' : 'to'} favourites`}
          aria-pressed={isSaved}
          onClick={() => onToggleSaved(resource.id)}
        >
          {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      </div>

      <div className="card-heading">
        <a href={href} onClick={open}>
          {resource.name}
        </a>
        <span className={`card-price pricing-${resource.pricing.toLowerCase()}`}>
          {resource.pricing}
        </span>
      </div>

      <p className="card-description">{resource.description}</p>

      <div className="card-byline">
        <span className="creator-avatar" aria-hidden="true">
          {resource.creator.charAt(0)}
        </span>
        <span className="creator-name">{resource.creator}</span>
        <ChevronRight size={12} aria-hidden="true" />
        <button onClick={() => onSelectCategory(resource.category)}>{resource.category}</button>
      </div>
    </article>
  );
}
