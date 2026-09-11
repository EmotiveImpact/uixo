import { ArrowRight, Layers3, Search, Shapes } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { searchIndex } from '../lib/filters';
import { categories, collections, resources } from '../data';

export type Command = {
  id: string;
  label: string;
  hint: string;
  kind: 'resource' | 'category' | 'collection';
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onOpenResource: (id: string) => void;
  onOpenCategory: (name: string) => void;
  onOpenCollection: (slug: string) => void;
};

const ICONS = {
  resource: Search,
  category: Shapes,
  collection: Layers3,
} as const;

export function CommandPalette({
  open,
  onClose,
  onOpenResource,
  onOpenCategory,
  onOpenCollection,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    // Escape must work wherever focus has landed, including on a result.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const commands = useMemo<Command[]>(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = (haystack: string) =>
      terms.every((term) => haystack.toLowerCase().includes(term));

    return [
      ...resources
        .filter((resource) => matches(searchIndex(resource)))
        .map<Command>((resource) => ({
          id: `r:${resource.id}`,
          label: resource.name,
          hint: resource.category,
          kind: 'resource',
          run: () => onOpenResource(resource.id),
        })),
      ...collections
        .filter((collection) => matches(`${collection.name} ${collection.tagline}`))
        .map<Command>((collection) => ({
          id: `c:${collection.slug}`,
          label: collection.name,
          hint: 'Collection',
          kind: 'collection',
          run: () => onOpenCollection(collection.slug),
        })),
      ...categories
        .filter((category) => matches(category.name))
        .map<Command>((category) => ({
          id: `k:${category.name}`,
          label: category.name,
          hint: 'Category',
          kind: 'category',
          run: () => onOpenCategory(category.name),
        })),
    ].slice(0, 12);
  }, [query, onOpenResource, onOpenCategory, onOpenCollection]);

  // Keep the highlight inside the list as it shrinks.
  const index = Math.min(active, Math.max(commands.length - 1, 0));

  if (!open) return null;

  const choose = (command: Command | undefined) => {
    if (!command) return;
    command.run();
    onClose();
    setQuery('');
  };

  return (
    <div className="palette-layer">
      <div className="palette-scrim" onClick={onClose} />
      <div
        className="palette"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search everything"
      >
        <div className="palette-input">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Jump to a website, collection or category…"
            aria-label="Search everything"
            aria-controls="palette-results"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((current) => Math.min(current + 1, commands.length - 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((current) => Math.max(current - 1, 0));
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                choose(commands[index]);
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>

        <ul className="palette-results" id="palette-results" role="listbox">
          {commands.length === 0 && <li className="palette-empty">Nothing matches that.</li>}
          {commands.map((command, position) => {
            const Icon = ICONS[command.kind];
            return (
              <li key={command.id}>
                <button
                  role="option"
                  aria-selected={position === index}
                  className={position === index ? 'active' : ''}
                  onMouseEnter={() => setActive(position)}
                  onClick={() => choose(command)}
                >
                  <Icon size={15} />
                  <span className="palette-label">{command.label}</span>
                  <span className="palette-hint">{command.hint}</span>
                  <ArrowRight size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
