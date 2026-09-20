import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ArrowUpRight, Bookmark, Menu, Moon, PanelLeft, Search, Sun, X } from 'lucide-react';
import { navigateInApp } from '../../lib/navigation';

type Props = {
  active: 'discover' | 'resources' | 'components' | 'collections';
  light: boolean;
  onToggleTheme: () => void;
  account?: ReactNode;
  onSearch?: () => void;
  sidebar?: {
    expanded: boolean;
    toggle: () => void;
  };
  sidebarTriggerRef?: RefObject<HTMLButtonElement | null>;
  adminAction?: ReactNode;
};

const destinations = [
  { id: 'discover', label: 'Discover', href: '/' },
  { id: 'components', label: 'Components', href: '/browse/assets' },
  { id: 'resources', label: 'Resources', href: '/browse' },
  { id: 'icons', label: 'Icon packs', href: '/browse/assets?kind=icon-pack' },
  { id: 'templates', label: 'Templates', href: '/category/templates' },
  { id: 'collections', label: 'Collections', href: '/collections' },
];

/** One full-width header, above the catalogue sidebar rather than inside it. */
export function DiscoveryHeader({
  active,
  light,
  onToggleTheme,
  account,
  onSearch,
  sidebar,
  sidebarTriggerRef,
  adminAction,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuTrigger.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);
  const icons =
    active === 'components' &&
    new URLSearchParams(window.location.search).get('kind') === 'icon-pack';
  const selected = window.location.pathname.startsWith('/category/templates')
    ? 'templates'
    : icons
      ? 'icons'
      : active;
  const navigate = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
      return;
    event.preventDefault();
    setMenuOpen(false);
    navigateInApp(href);
  };
  return (
    <header className="discovery-header">
      <div className="discovery-header-inner">
        <a
          className="discovery-wordmark"
          aria-label="UIXO home"
          href="/"
          onClick={(e) => navigate(e, '/')}
        >
          UIXO
          <span className="wordmark-dot" aria-hidden="true" />
        </a>
        <nav className="discovery-navigation" aria-label="Main navigation">
          {destinations.map((item) => (
            <a
              key={item.id}
              href={item.href}
              aria-current={selected === item.id ? 'page' : undefined}
              onClick={(e) => navigate(e, item.href)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="discovery-header-actions">
          <button
            className="header-search"
            onClick={onSearch ?? (() => navigateInApp('/browse/assets'))}
            aria-label="Search UIXO"
          >
            <Search size={15} />
            <span>Search UIXO</span>
            <kbd>⌘ K</kbd>
          </button>
          <a
            className="header-icon header-saved"
            href="/browse/assets?view=saved"
            aria-label="Saved assets"
            onClick={(e) => navigate(e, '/browse/assets?view=saved')}
          >
            <Bookmark size={17} />
          </a>
          <button
            className="header-icon"
            onClick={onToggleTheme}
            aria-label={`Switch to ${light ? 'dark' : 'light'} theme`}
          >
            {light ? <Moon size={17} /> : <Sun size={17} />}
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
              <PanelLeft size={18} />
            </button>
          )}
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
        </div>
      </div>
      {menuOpen && (
        <nav
          id="discovery-mobile-navigation"
          className="discovery-mobile-menu"
          aria-label="Mobile navigation"
        >
          {destinations.map((item) => (
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
        </nav>
      )}
    </header>
  );
}
