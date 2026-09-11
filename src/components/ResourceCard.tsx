import { ArrowUpRight, Bookmark, BookmarkCheck } from 'lucide-react';
import { useState } from 'react';
import { Thumbnail } from './Thumbnail';
import type { Resource } from '../types';

type ResourceCardProps = {
  resource: Resource;
  isSaved: boolean;
  href: string;
  onOpen: (id: string) => void;
  onToggleSaved: (id: string) => void;
  onSelectCategory: (category: string) => void;
  onSelectFormat: (format: string) => void;
};

export function ResourceCard({
  resource,
  isSaved,
  href,
  onOpen,
  onToggleSaved,
  onSelectCategory,
  onSelectFormat,
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
      </a>

      <div className="card-heading">
        <a href={href} onClick={open}>
          {resource.name}
        </a>
        <div className="card-actions">
          <a
            className="visit"
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${resource.name} website`}
          >
            <ArrowUpRight size={17} />
          </a>
          <button
            className="save"
            aria-label={`${isSaved ? 'Remove' : 'Save'} ${resource.name} ${isSaved ? 'from' : 'to'} favourites`}
            aria-pressed={isSaved}
            onClick={() => onToggleSaved(resource.id)}
          >
            {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
        </div>
      </div>

      <p className="card-description">{resource.description}</p>

      <div className="metadata">
        <span>by {resource.creator}</span>
        <span>·</span>
        <span className={`pricing pricing-${resource.pricing.toLowerCase()}`}>
          {resource.pricing}
        </span>
      </div>

      <div className="resource-tags">
        <button onClick={() => onSelectCategory(resource.category)}>{resource.category}</button>
        <button onClick={() => onSelectFormat(resource.formats[0])}>{resource.formats[0]}</button>
      </div>
    </article>
  );
}
