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
  onOpenModal: (modal: ModalName) => void;
  account: ReactNode;
  /** The shared shell can search individual assets without claiming they are websites. */
  assetSearch?: boolean;
  catalogue?: 'websites' | 'assets' | 'collections';
  collectionIndex?: boolean;
  showDiscovery?: boolean;
};

export function TopBar({
  searchRef,
  search,
  onSearchChange,
  price,
  onPriceChange,
  light,
  onToggleTheme,
  onOpenModal,
  account,
  assetSearch = false,
  catalogue = 'websites',
  collectionIndex = false,
  showDiscovery = true,
}: TopBarProps) {
  return (
    <>
      <header className="topbar unified-topbar">
        <AnimatedSidebarTrigger
          className="utility mobile-sidebar-trigger"
          aria-label="Open navigation"
        >
          <PanelLeft className="size-4" />
        </AnimatedSidebarTrigger>

        <nav className="catalogue-nav" aria-label="Catalogue">
          {(['websites', 'assets', 'collections'] as const).map((type) => (
            <a
              key={type}
              href={
                type === 'websites'
                  ? '/browse'
                  : type === 'assets'
                    ? '/browse/assets'
                    : '/collections'
              }
              aria-current={catalogue === type ? 'page' : undefined}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </a>
          ))}
        </nav>
        <nav className="top-nav" aria-label="Main navigation">
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
      {showDiscovery && (
        <div className="discovery-controls">
          {showDiscovery && (
            <div className="search-wrap">
              <Search size={16} />
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                type="search"
                maxLength={assetSearch ? 300 : undefined}
                aria-label={
                  collectionIndex
                    ? 'Search collections'
                    : assetSearch
                      ? 'Search assets'
                      : catalogue === 'collections'
                        ? 'Search this collection'
                        : 'Search websites'
                }
                placeholder={
                  collectionIndex
                    ? 'Search collections…'
                    : assetSearch
                      ? 'Search components, icons and assets…'
                      : 'Search by name, tag or use case…'
                }
              />
              <kbd>/</kbd>
            </div>
          )}
          {!collectionIndex && showDiscovery && (
            <div className="segments prices" role="group" aria-label="Pricing">
              {PRICE_FILTERS.filter((option) => !assetSearch || option !== 'Freemium').map(
                (option) => (
                  <button
                    key={option}
                    className={price === option ? 'selected' : ''}
                    aria-pressed={price === option}
                    onClick={() => onPriceChange(option)}
                  >
                    {option}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
