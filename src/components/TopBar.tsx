import { ToggleGroup } from 'radix-ui';
import { ControlHint } from './ControlHint';
import { ArrowLeft, Moon, PanelLeft, Search, ShieldCheck, Sun } from 'lucide-react';
import type { RefObject } from 'react';
import { AnimatedSidebarTrigger } from './motion/animated-sidebar';
import { navigateInApp } from '../lib/navigation';
import { PRICE_FILTERS } from '../types';
import type { ReactNode } from 'react';
import type { ModalName, PriceFilter } from '../types';

type TopBarProps = {
  light: boolean;
  onToggleTheme: () => void;
  onOpenModal: (modal: ModalName) => void;
  account: ReactNode;
  catalogue?: 'websites' | 'assets' | 'collections';
  adminMode?: boolean;
  adminAction?: {
    label: 'Admin' | 'Exit admin';
    href: string;
    onSelect: () => void;
  };
};
type DiscoveryControlsProps = {
  searchRef: RefObject<HTMLInputElement | null>;
  search: string;
  onSearchChange: (value: string) => void;
  price: PriceFilter;
  onPriceChange: (price: PriceFilter) => void;
  assetSearch?: boolean;
  catalogue?: 'websites' | 'assets' | 'collections';
  collectionIndex?: boolean;
  showDiscovery?: boolean;
};

export function TopBar({
  light,
  onToggleTheme,
  onOpenModal,
  account,
  catalogue = 'websites',
  adminMode = false,
  adminAction,
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

        {adminMode ? (
          <div className="admin-mode-label">
            <ShieldCheck size={14} /> Admin mode
          </div>
        ) : (
          <nav className="catalogue-nav" aria-label="Catalogue">
            {(['websites', 'assets', 'collections'] as const).map((type) => {
              const href =
                type === 'websites'
                  ? '/browse'
                  : type === 'assets'
                    ? '/browse/assets'
                    : '/collections';
              return (
                <a
                  key={type}
                  href={href}
                  aria-current={catalogue === type ? 'page' : undefined}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    navigateInApp(href);
                  }}
                >
                  {type === 'websites'
                    ? 'Resources'
                    : type === 'assets'
                      ? 'Components'
                      : 'Collections'}
                </a>
              );
            })}
          </nav>
        )}
        <nav className="top-nav" aria-label="Main navigation">
          {adminAction && (
            <a
              className="admin-mode-action"
              href={adminAction.href}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                adminAction.onSelect();
              }}
            >
              {adminAction.label === 'Exit admin' && <ArrowLeft size={13} />}
              {adminAction.label}
            </a>
          )}
          <button onClick={() => onOpenModal('about')}>About</button>
        </nav>

        <ControlHint label={`Switch to ${light ? 'dark' : 'light'} theme`}>
          <button
            className="utility theme"
            onClick={onToggleTheme}
            aria-label={`Switch to ${light ? 'dark' : 'light'} theme`}
          >
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </ControlHint>

        {account}
      </header>
    </>
  );
}

export function DiscoveryControls({
  searchRef,
  search,
  onSearchChange,
  price,
  onPriceChange,
  assetSearch = false,
  catalogue = 'websites',
  collectionIndex = false,
  showDiscovery = true,
}: DiscoveryControlsProps) {
  return (
    <>
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
                      ? 'Search components and icon packs…'
                      : 'Search by name, tag or use case…'
                }
              />
              <kbd>/</kbd>
            </div>
          )}
          {!collectionIndex && showDiscovery && (
            <ToggleGroup.Root
              className="segments prices"
              type="single"
              value={price}
              onValueChange={(value) => {
                if (value) onPriceChange(value as PriceFilter);
              }}
              aria-label="Pricing"
            >
              {PRICE_FILTERS.filter((option) => !assetSearch || option !== 'Freemium').map(
                (option) => (
                  <ToggleGroup.Item
                    value={option}
                    key={option}
                    className={price === option ? 'selected' : ''}
                  >
                    {option}
                  </ToggleGroup.Item>
                ),
              )}
            </ToggleGroup.Root>
          )}
        </div>
      )}
    </>
  );
}
