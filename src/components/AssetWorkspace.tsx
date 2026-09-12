import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatedSidebarInset, AnimatedSidebarProvider } from './motion/animated-sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { AccountMenu } from './AccountMenu';
import { AppDialog } from './AppDialog';
import { PageHeading } from './PageHeading';
import { AssetUtilities } from './AssetUtilities';
import { AssetLibrary } from './AssetLibrary';
import { useAuth } from '../hooks/useAuth';
import { useLists } from '../hooks/useLists';
import { useTheme } from '../hooks/useTheme';
import { useDensity } from '../hooks/useDensity';
import { useDialog } from '../hooks/useDialog';
import { useSearchHotkey } from '../hooks/useSearchHotkey';
import { EMPTY_ROUTE, routeToHref } from '../lib/url';
import { ASSET_PATH, EMPTY_ASSET_QUERY, assetHref, readAssetQuery } from '../lib/asset-library';
import type { AssetQuery } from '../lib/asset-library';
import type { ModalName, PriceFilter } from '../types';
import './asset-library.css';

const sizing = {
  '--sidebar-width': '15.25rem',
  '--sidebar-width-icon': '4.25rem',
} as CSSProperties;
/** Same UIXO components as App, with a separately loaded, server-backed catalogue. */
export function AssetWorkspace() {
  const [query, setQuery] = useState(() => readAssetQuery(window.location.search));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState<ModalName | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialog(modal !== null);
  const { light, toggle: toggleTheme } = useTheme();
  const { density } = useDensity();
  const {
    user,
    isCurator,
    settled,
    signIn,
    signUp,
    signInWithProvider,
    signOut,
    available: authAvailable,
  } = useAuth();
  const { lists, remove } = useLists(user?.id ?? null, settled);
  useSearchHotkey(searchRef, !modal && !mobileOpen && !query.id);
  useEffect(() => {
    const read = () => setQuery(readAssetQuery(window.location.search));
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        !modal &&
        !query.id
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, [modal, query.id]);
  const navigate = useCallback((changes: Partial<AssetQuery>, reset = false) => {
    setQuery((current) => {
      const next = { ...(reset ? EMPTY_ASSET_QUERY : current), ...changes };
      const href = assetHref(next);
      if (href !== window.location.pathname + window.location.search) {
        const structural = reset || 'view' in changes || 'id' in changes || 'offset' in changes;
        if (structural) window.history.pushState(null, '', href);
        else window.history.replaceState(null, '', href);
      }
      return next;
    });
    setMobileOpen(false);
  }, []);
  const go = (changes: Parameters<typeof routeToHref>[0]) =>
    window.location.assign(routeToHref(changes));
  const openCategory = (category: string, sub: string | null = null) =>
    go({ ...EMPTY_ROUTE, category, sub });
  const utility = ['connect', 'guide', 'review', 'scout', 'jobs'].includes(query.view);
  const titles: Record<string, string> = {
    connect: 'Connect your AI agent',
    guide: 'How to use UIXO',
    review: 'Review queue',
    scout: 'Scout intake',
    jobs: 'Indexing runs',
  };
  const title =
    titles[query.view] ||
    (query.view === 'sources'
      ? 'Indexed sources'
      : query.view === 'saved'
        ? 'Saved assets'
        : 'Find your next great detail.');
  const hasFilters = Boolean(
    query.q ||
    query.kind ||
    query.provider ||
    query.framework ||
    query.format ||
    query.price ||
    query.commercial,
  );
  return (
    <AnimatedSidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      openMobile={mobileOpen}
      onOpenMobileChange={setMobileOpen}
      style={sizing}
    >
      <AppSidebar
        category={null}
        sub={null}
        listId={null}
        openSection={null}
        lists={lists}
        onAssets
        assetKind={query.kind}
        onChooseAssetKind={(kind) => navigate({ kind }, true)}
        onShowAssets={() => navigate({}, true)}
        onShowAll={() => go({ ...EMPTY_ROUTE })}
        homeHref="/browse"
        onShowCollections={() => go({ ...EMPTY_ROUTE, collectionsIndex: true })}
        onCollections={false}
        onChooseList={(listId) => go({ ...EMPTY_ROUTE, listId })}
        onDeleteList={remove}
        onChooseCategory={openCategory}
        onChooseSub={openCategory}
        onSubmit={() => setModal('submit')}
      />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AnimatedSidebarInset className="site-main asset-workspace" id="main" tabIndex={-1}>
        <TopBar
          assetSearch
          searchInContent
          searchRef={searchRef}
          search={query.q}
          onSearchChange={(q) =>
            navigate({ q, offset: 0, view: query.view === 'sources' ? 'assets' : query.view })
          }
          price={
            (query.price === 'free'
              ? 'Free'
              : query.price === 'paid'
                ? 'Paid'
                : 'All') as PriceFilter
          }
          onPriceChange={(price) =>
            navigate({ price: price === 'All' ? '' : price.toLowerCase(), offset: 0 })
          }
          light={light}
          onToggleTheme={toggleTheme}
          onOpenModal={setModal}
          account={
            <AccountMenu
              available={authAvailable}
              user={user}
              onSignIn={() => setModal('signin')}
              onDashboard={() => go({ ...EMPTY_ROUTE, dashboard: true })}
              onSignOut={signOut}
              dashboardHref="/dashboard"
            />
          }
        />
        <div className="asset-library-switch" aria-label="Catalogue">
          <a href="/browse">Websites</a>
          <a href={ASSET_PATH} aria-current="page">
            Assets
          </a>
        </div>
        <PageHeading
          title={title}
          subtitle={
            utility
              ? 'One library. Your workflow.'
              : 'Components and icons, with the source left intact. Find it, understand it, make it yours.'
          }
          canClear={hasFilters}
          onClear={() => navigate({ view: query.view }, true)}
        />
        {!utility && (
          <form
            className="asset-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              searchRef.current?.blur();
            }}
          >
            <input
              ref={searchRef}
              type="search"
              aria-label="Search assets"
              placeholder="A sidebar, an icon, a small detail…"
              maxLength={300}
              value={query.q}
              onChange={(event) => navigate({ q: event.target.value, offset: 0 })}
            />
            <kbd>/</kbd>
            <button type="submit">Find assets ↗</button>
          </form>
        )}
        {utility ? (
          <AssetUtilities key={query.view} view={query.view} />
        ) : (
          <AssetLibrary query={query} navigate={navigate} density={density} />
        )}
        <footer className="asset-library-footer">
          <span>UIXO keeps the index. Creators keep the credit.</span>
          {isCurator && <a href="/browse/assets?view=review">Open curator workspace</a>}
        </footer>
      </AnimatedSidebarInset>
      <AppDialog
        dialogRef={dialogRef}
        modal={modal}
        onClose={() => setModal(null)}
        userId={user?.id ?? null}
        onSignIn={signIn}
        onSignUp={signUp}
        onProvider={signInWithProvider}
        onAuthDone={() => setModal(null)}
      />
    </AnimatedSidebarProvider>
  );
}
