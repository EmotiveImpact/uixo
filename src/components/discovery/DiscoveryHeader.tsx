import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  ChevronDown,
  Menu,
  Moon,
  PanelLeft,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { categories, resources } from '../../data';
import { navigateInApp } from '../../lib/navigation';
import { slugify } from '../../lib/url';

type Props = {
  active: 'discover' | 'resources' | 'components' | 'collections';
  light: boolean;
  compactNavigation?: boolean;
  onToggleTheme: () => void;
  account?: ReactNode;
  onSearch?: () => void;
  /** What the search pill finds here, e.g. "Search components". */
  searchLabel?: string;
  sidebar?: {
    expanded: boolean;
    toggle: () => void;
  };
  sidebarTriggerRef?: RefObject<HTMLButtonElement | null>;
  adminAction?: ReactNode;
  /** Signed out with accounts on offer: phones show Sign in in the menu, not the header. */
  onSignIn?: () => void;
};

type Destination = { id: string; label: string; href: string; count?: number };

/** Everything that used to be a top-level tab now lives in one Browse menu, as UI8 does. */
const assetDestinations: Destination[] = [
  { id: 'components', label: 'Components', href: '/browse/assets' },
  { id: 'icons', label: 'Icon packs', href: '/browse/assets?kind=icon-pack' },
  { id: 'fonts', label: 'Fonts', href: '/browse/assets?kind=font' },
];

const resourceDestinations: Destination[] = [
  { id: 'resources', label: 'All resources', href: '/browse', count: resources.length },
  ...categories.map((category) => ({
    id: slugify(category.name),
    label: category.name,
    href: `/category/${slugify(category.name)}`,
    count: resources.filter((resource) => resource.category === category.name).length,
  })),
];

const browseDestinations = [...assetDestinations, ...resourceDestinations];

const primaryLinks: (Destination & { badge?: string })[] = [
  { id: 'collections', label: 'Collections', href: '/collections' },
  {
    id: 'developers',
    label: 'For developers',
    href: '/browse/assets?view=connect',
    badge: 'MCP',
  },
];

/** The violet tile with four white parts that sits beside the UIXO wordmark. */
export function Logomark() {
  return (
    <span className="g-logomark" aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <rect x="1" y="1" width="6" height="6" rx="1.8" fill="#fff" />
        <circle cx="12" cy="4" r="3" fill="#fff" fillOpacity=".6" />
        <rect x="1" y="9" width="6" height="6" rx="1.8" fill="#fff" fillOpacity=".6" />
        <rect x="9" y="9" width="6" height="6" rx="3" fill="#fff" />
      </svg>
    </span>
  );
}

/** One full-width header, above the catalogue sidebar rather than inside it. */
export function DiscoveryHeader({
  active,
  compactNavigation = false,
  light,
  onToggleTheme,
  account,
  onSearch,
  searchLabel = 'Search components',
  sidebar,
  sidebarTriggerRef,
  adminAction,
  onSignIn,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const browseTrigger = useRef<HTMLButtonElement>(null);
  const browsePanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen && !browseOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (browseOpen) {
        setBrowseOpen(false);
        browseTrigger.current?.focus();
      } else {
        setMenuOpen(false);
        menuTrigger.current?.focus();
      }
    };
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (browsePanel.current?.contains(target) || browseTrigger.current?.contains(target)) return;
      setBrowseOpen(false);
    };
    window.addEventListener('keydown', close);
    window.addEventListener('pointerdown', dismiss);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('pointerdown', dismiss);
    };
  }, [menuOpen, browseOpen]);
  const assetKind =
    active === 'components' ? new URLSearchParams(window.location.search).get('kind') : null;
  const categoryPath = window.location.pathname.match(/^\/category\/([^/]+)/)?.[1];
  const selected = categoryPath
    ? categoryPath
    : assetKind === 'icon-pack'
      ? 'icons'
      : assetKind === 'font'
        ? 'fonts'
        : active;
  const navigate = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
      return;
    event.preventDefault();
    setMenuOpen(false);
    setBrowseOpen(false);
    navigateInApp(href);
  };
  const browsing = browseDestinations.some((item) => item.id === selected);
  const destinationLink = (item: Destination) => (
    <a
      key={item.id}
      href={item.href}
      aria-current={selected === item.id ? 'page' : undefined}
      onClick={(e) => navigate(e, item.href)}
    >
      <span>{item.label}</span>
      {item.count !== undefined && <small>{item.count}</small>}
    </a>
  );
  return (
    <header className={`discovery-header ${compactNavigation ? 'home-header' : ''}`}>
      <div className="discovery-header-inner">
        <a
          className="brand discovery-brand"
          aria-label="UIXO home"
          href="/"
          onClick={(e) => navigate(e, '/')}
        >
          <Logomark />
          <span className="discovery-wordmark">UIXO</span>
        </a>
        <nav className="discovery-navigation" aria-label="Main navigation">
          <button
            ref={browseTrigger}
            className="discovery-browse-trigger"
            aria-expanded={browseOpen}
            aria-controls="discovery-browse-menu"
            data-active={browsing || undefined}
            onClick={() => setBrowseOpen(!browseOpen)}
          >
            Browse
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {primaryLinks.map((item) => (
            <a
              key={item.id}
              href={item.href}
              aria-current={selected === item.id ? 'page' : undefined}
              onClick={(e) => navigate(e, item.href)}
            >
              {item.label}
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </a>
          ))}
        </nav>
        <div className="discovery-header-actions">
          <button
            className="header-search"
            onClick={
              onSearch ??
              (() =>
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })))
            }
            aria-label={searchLabel}
            aria-keyshortcuts="Meta+K Control+K"
            title={`${searchLabel} (⌘K)`}
          >
            <Search size={16} aria-hidden="true" />
            <span>{searchLabel}</span>
            <kbd aria-hidden="true">⌘K</kbd>
          </button>
          <a
            className="header-icon header-saved"
            href="/browse/assets?view=saved"
            aria-label="Saved assets"
            onClick={(e) => navigate(e, '/browse/assets?view=saved')}
          >
            <Bookmark size={18} />
          </a>
          <button
            className="header-icon"
            onClick={onToggleTheme}
            aria-label={`Switch to ${light ? 'dark' : 'light'} theme`}
          >
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {adminAction}
          {account}
          {sidebar && (
            <button
              ref={sidebarTriggerRef}
              className="header-icon discovery-sidebar-trigger"
              aria-label="Open navigation"
              aria-expanded={sidebar.expanded}
              onClick={sidebar.toggle}
            >
              <PanelLeft className="sidebar-trigger-desktop" size={18} />
              <Menu className="sidebar-trigger-phone" size={19} />
            </button>
          )}
          {!sidebar && (
            <button
              ref={menuTrigger}
              className="header-icon discovery-menu-trigger"
              aria-controls="discovery-mobile-navigation"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          )}
        </div>
      </div>
      {browseOpen && (
        <div
          ref={browsePanel}
          id="discovery-browse-menu"
          className="discovery-browse-menu"
          role="region"
          aria-label="Browse UIXO"
        >
          <div className="discovery-browse-menu-inner">
            <section>
              <h2>Components and assets</h2>
              {assetDestinations.map(destinationLink)}
            </section>
            <section className="browse-menu-resources">
              <h2>Websites and resources</h2>
              {resourceDestinations.map(destinationLink)}
            </section>
            <a
              className="browse-menu-feature"
              href="/browse?browse=Recent"
              onClick={(e) => navigate(e, '/browse?browse=Recent')}
            >
              <span>Fresh this week</span>
              <strong>New finds, added every weekday</strong>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
      {menuOpen && (
        <nav
          id="discovery-mobile-navigation"
          className="discovery-mobile-menu"
          aria-label="Mobile navigation"
        >
          {[
            ...assetDestinations,
            { id: 'resources', label: 'Resources', href: '/browse' },
            ...primaryLinks,
          ].map((item) => (
            <a
              key={item.id}
              href={item.href}
              aria-current={selected === item.id ? 'page' : undefined}
              onClick={(e) => navigate(e, item.href)}
            >
              {item.label}
              <ArrowUpRight size={15} />
            </a>
          ))}
          {onSignIn && (
            <button
              type="button"
              className="discovery-mobile-signin"
              onClick={() => {
                setMenuOpen(false);
                onSignIn();
              }}
            >
              Sign in
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
