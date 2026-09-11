import { ArrowUpRight, Check, Flag, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Thumbnail } from './Thumbnail';
import { listsHolding } from '../lib/lists';
import { addReport } from '../lib/submissions';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { List, Resource } from '../types';

type QuickViewProps = {
  resource: Resource | null;
  lists: List[];
  onClose: () => void;
  onToggleIn: (listId: string, resourceId: string) => void;
  onCreateList: (name: string) => void;
  onSelectCategory: (category: string) => void;
};

function formatChecked(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * A side panel rather than a route swap, so the visitor keeps their place in the grid.
 */
export function QuickView({
  resource,
  lists,
  onClose,
  onToggleIn,
  onCreateList,
  onSelectCategory,
}: QuickViewProps) {
  const [newList, setNewList] = useState('');
  const [reported, setReported] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useFocusTrap(panelRef, Boolean(resource));

  // Move focus into the panel when it opens, so keyboard users are not left behind in the grid.
  useEffect(() => {
    // preventScroll: focusing the pinned close button otherwise scrolls the panel past the preview.
    if (resource) closeRef.current?.focus({ preventScroll: true });
  }, [resource]);

  useEffect(() => {
    if (!resource) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resource, onClose]);

  if (!resource) return null;

  const holding = listsHolding(lists, resource.id);

  const report = () => {
    addReport(resource.id, 'Reported from the quick view', null);
    setReported(true);
  };

  return (
    <div className="quickview-layer">
      <div className="quickview-scrim" onClick={onClose} />
      <aside
        className="quickview"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${resource.name} details`}
      >
        <button
          className="quickview-close utility"
          onClick={onClose}
          aria-label="Close details"
          ref={closeRef}
        >
          <X size={17} />
        </button>

        <div className="quickview-preview">
          {imageFailed ? (
            <span className="preview-fallback" aria-hidden="true">
              {resource.name.charAt(0)}
            </span>
          ) : (
            <Thumbnail
              id={resource.id}
              alt={`${resource.name} website preview`}
              sizes="(max-width: 767px) 100vw, 430px"
              eager
              onError={() => setImageFailed(true)}
            />
          )}
        </div>

        <h2>{resource.name}</h2>
        <p className="quickview-description">{resource.description}</p>

        <a
          className="quickview-visit"
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit website <ArrowUpRight size={16} />
        </a>

        <dl className="quickview-facts">
          <div>
            <dt>Creator</dt>
            <dd>{resource.creator}</dd>
          </div>
          <div>
            <dt>Pricing</dt>
            <dd className={`pricing pricing-${resource.pricing.toLowerCase()}`}>
              {resource.pricing}
            </dd>
          </div>
          <div>
            <dt>Formats</dt>
            <dd>{resource.formats.join(', ')}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>
              <button className="linkish" onClick={() => onSelectCategory(resource.category)}>
                {resource.category}
              </button>
            </dd>
          </div>
        </dl>

        <section className="quickview-section">
          <h3>Save to a list</h3>
          <ul className="list-picker">
            {lists.map((list) => {
              const checked = holding.includes(list.id);
              return (
                <li key={list.id}>
                  <button
                    aria-pressed={checked}
                    className={checked ? 'selected' : ''}
                    onClick={() => onToggleIn(list.id, resource.id)}
                  >
                    <span>{list.name}</span>
                    {checked && <Check size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
          <form
            className="list-create"
            onSubmit={(event) => {
              event.preventDefault();
              if (!newList.trim()) return;
              onCreateList(newList);
              setNewList('');
            }}
          >
            <input
              value={newList}
              onChange={(event) => setNewList(event.target.value)}
              placeholder="New list…"
              aria-label="New list name"
            />
            <button aria-label="Create list">
              <Plus size={15} />
            </button>
          </form>
        </section>

        <footer className="quickview-footer">
          <span>Link checked {formatChecked(resource.lastChecked)}</span>
          {reported ? (
            <span className="reported">Thanks — flagged for review.</span>
          ) : (
            <button className="linkish" onClick={report}>
              <Flag size={13} /> Report broken or outdated
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
