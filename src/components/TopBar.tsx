import { Moon, PanelLeft, Search, Sun } from 'lucide-react';
import type { RefObject } from 'react';
import { AnimatedSidebarTrigger } from './motion/animated-sidebar';
import { PRICE_FILTERS } from '../types';
import type { ReactNode } from 'react';
import type { ModalName, PriceFilter } from '../types';

type TopBarProps = {
  searchRef: RefObject<HTMLInputElement | null>;
  search: string;
  onSearchChange: (value: string) => void;
  price: PriceFilter;
  onPriceChange: (price: PriceFilter) => void;
  light: boolean;
  onToggleTheme: () => void;
  onReset: () => void;
  onOpenModal: (modal: ModalName) => void;
  onOpenCollections: () => void;
  collectionsHref: string;
  onCollections: boolean;
  account: ReactNode;
  /** The shared shell can search individual assets without claiming they are websites. */
  assetSearch?: boolean;
  searchInContent?: boolean;
};

export function TopBar({
  searchRef,
  search,
  onSearchChange,
  price,
  onPriceChange,
  light,
  onToggleTheme,
  onReset,
  onOpenModal,
  onOpenCollections,
  collectionsHref,
  onCollections,
  account,
  assetSearch = false,
  searchInContent = false,
}: TopBarProps) {
  return (
    <header className="topbar">
      <AnimatedSidebarTrigger
        className="utility mobile-sidebar-trigger"
        aria-label="Open navigation"
      >
        <PanelLeft className="size-4" />
      </AnimatedSidebarTrigger>

      {!searchInContent && (
        <div className="search-wrap">
          <Search size={16} />
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            type="search"
            maxLength={assetSearch ? 300 : undefined}
            aria-label={assetSearch ? 'Search assets' : 'Search websites'}
            placeholder={
              assetSearch
                ? 'Search components, icons and assets…'
                : 'Search by name, tag or use case…'
            }
          />
          <kbd>/</kbd>
        </div>
      )}

      <div className="segments prices" role="group" aria-label="Pricing">
        {PRICE_FILTERS.filter((option) => !assetSearch || option !== 'Freemium').map((option) => (
          <button
            key={option}
            className={price === option ? 'selected' : ''}
            aria-pressed={price === option}
            onClick={() => onPriceChange(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <nav className="top-nav" aria-label="Main navigation">
        <button className={onCollections ? '' : 'selected'} onClick={onReset}>
          Explore
        </button>
        <a
          className={onCollections ? 'selected' : ''}
          href={collectionsHref}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey) return;
            event.preventDefault();
            onOpenCollections();
          }}
        >
          Collections
        </a>
        <button onClick={() => onOpenModal('about')}>About</button>
      </nav>

      <button
        className="utility theme"
        onClick={onToggleTheme}
        aria-label={`Switch to ${light ? 'dark' : 'light'} theme`}
      >
        {light ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      {account}
    </header>
  );
}
