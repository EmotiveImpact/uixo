import { ToggleGroup } from 'radix-ui';
import { ArrowLeft, Search } from 'lucide-react';
import type { RefObject } from 'react';
import { useAnimatedSidebar } from './motion/animated-sidebar';
import { DiscoveryHeader } from './discovery/DiscoveryHeader';
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
  const sidebar = useAnimatedSidebar();
  return (
    <DiscoveryHeader
      active={
        catalogue === 'websites'
          ? 'resources'
          : catalogue === 'assets'
            ? 'components'
            : 'collections'
      }
      light={light}
      onToggleTheme={onToggleTheme}
      account={account}
      sidebar={{
        expanded: sidebar.isMobile ? sidebar.openMobile : sidebar.open,
        toggle: sidebar.toggleSidebar,
        triggerRef: sidebar.triggerRef,
      }}
      onSearch={() =>
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
      }
      adminAction={
        adminMode && adminAction ? (
          <a
            className="header-admin"
            href={adminAction.href}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              adminAction.onSelect();
            }}
          >
            <ArrowLeft size={13} /> {adminAction.label}
          </a>
        ) : (
          <button className="header-about" onClick={() => onOpenModal('about')}>
            About
          </button>
        )
      }
    />
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
