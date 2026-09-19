import { FeaturedCollections } from './DiscoveryCollections';
import { RegistryIntelligence } from './RegistryIntelligence';
import { NotFound } from './NotFound';
import { COMPONENT_CATEGORIES } from '../../shared/component-categories';
import { SiteFooter } from './SiteFooter';
import { useSidebarPreference } from '../hooks/useSidebarPreference';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedSidebarInset, AnimatedSidebarProvider } from './motion/animated-sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar, DiscoveryControls } from './TopBar';
import { AccountMenu } from './AccountMenu';
import { AppDialog } from './AppDialog';
import { PageHeading } from './PageHeading';
import { AssetUtilities } from './AssetUtilities';
import { AssetLibrary } from './AssetLibrary';
import { SaveSyncNotice } from './SaveSyncNotice';
import { useAuth } from '../hooks/useAuth';
import { useAssetSaves } from '../hooks/useAssetSaves';
import { useLists } from '../hooks/useLists';
import { useTheme } from '../hooks/useTheme';
import { useDensity } from '../hooks/useDensity';
import { useDialog } from '../hooks/useDialog';
import { useSearchHotkey } from '../hooks/useSearchHotkey';
import { EMPTY_ROUTE, routeToHref } from '../lib/url';
import { navigateInApp } from '../lib/navigation';
import { APP_SIDEBAR_SIZING } from '../lib/layout';
import {
  EMPTY_ASSET_QUERY,
  assetHref,
  readAssetQuery,
  registryRequest,
} from '../lib/asset-library';
import type { AssetQuery, ProviderRecord } from '../lib/asset-library';
import type { ModalName, PriceFilter } from '../types';
import './asset-library.css';

/** Same UIXO components as App, with a separately loaded, server-backed catalogue. */
export function AssetWorkspace() {
  const [query, setQuery] = useState(() => readAssetQuery(window.location.search));
  const [sidebarOpen, setSidebarOpen] = useSidebarPreference();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState<ModalName | null>(null);
  const [assetProviders, setAssetProviders] = useState<ProviderRecord[]>([]);
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
  const {
    lists,
    remove,
    syncStatus: listSyncStatus,
    syncError: listSyncError,
    retrySync: retryListSync,
  } = useLists(user?.id ?? null, settled);
  const assetSaves = useAssetSaves(user?.id ?? null, settled);
  useSearchHotkey(searchRef, !modal && !mobileOpen && !query.id);
  useEffect(() => {
    const abort = new AbortController();
    void registryRequest<{ items: ProviderRecord[] }>('providers', { signal: abort.signal })
      .then((value) => {
        if (Array.isArray(value.items)) setAssetProviders(value.items);
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
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
  const go = (changes: Parameters<typeof routeToHref>[0]) => navigateInApp(routeToHref(changes));
  const openCategory = (category: string, sub: string | null = null) =>
    go({ ...EMPTY_ROUTE, category, sub });
  const intelligence = [
    'health',
    'operations',
    'collections',
    'collection-editor',
    'sources',
  ].includes(query.view);
  const privateWorkspace = ['health', 'operations', 'collection-editor'].includes(query.view);
  const utility = ['connect', 'guide', 'review', 'scout', 'jobs'].includes(query.view);
  const titles: Record<string, string> = {
    health: 'Registry health',
    operations: 'Registry operations',
    collections: 'Asset collections',
    'collection-editor': 'Collection editorial',
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
        : COMPONENT_CATEGORIES.find((entry) => entry.id === query.category)?.label ||
          (query.kind === 'icon-pack'
            ? 'Icon packs'
            : query.kind === 'component'
              ? 'Components'
              : 'Assets'));
  const hasFilters = Boolean(
    query.q ||
    query.kind ||
    query.category ||
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
      style={APP_SIDEBAR_SIZING}
    >
      <AppSidebar
        category={null}
        sub={null}
        listId={null}
        openSection={null}
        lists={lists}
        onAssets
        assetView={query.view}
        registryCurator={isCurator}
        onChooseAssetView={(view) => navigate({ view }, true)}
        onSavedAssets={query.view === 'saved'}
        onShowSavedAssets={() => navigate({ view: 'saved' }, true)}
        savedAssetCount={assetSaves.saved.length}
        assetKind={query.kind}
        assetCategory={query.category}
        onChooseAssetCategory={(category) =>
          navigate({
            kind: 'component',
            category,
            view: query.view === 'saved' ? 'saved' : 'assets',
            offset: 0,
            id: '',
          })
        }
        onChooseAssetKind={(kind) =>
          navigate({
            kind,
            category: '',
            view: query.view === 'saved' ? 'saved' : 'assets',
            offset: 0,
            id: '',
          })
        }
        assetProviders={assetProviders}
        onShowAll={() => go({ ...EMPTY_ROUTE })}
        homeHref="/browse"
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
          catalogue="assets"
          light={light}
          onToggleTheme={toggleTheme}
          onOpenModal={setModal}
          adminAction={
            isCurator
              ? { label: 'Admin', href: '/admin', onSelect: () => navigateInApp('/admin') }
              : undefined
          }
          account={
            <AccountMenu
              available={authAvailable}
              user={user}
              onSignIn={() => setModal('signin')}
              onDashboard={() => go({ ...EMPTY_ROUTE, dashboard: true })}
              onAdmin={() => navigateInApp('/admin')}
              onSignOut={signOut}
              dashboardHref="/dashboard"
              adminHref="/admin"
            />
          }
        />
        <PageHeading
          title={title}
          subtitle={
            intelligence
              ? 'Source-backed selections and evidence from the UIXO registry.'
              : utility
                ? 'One library. Your workflow.'
                : 'Live components and icon packs, with the source left intact. Find it, understand it, make it yours.'
          }
          canClear={hasFilters}
          onClear={() => navigate({ view: query.view }, true)}
        />
        <SaveSyncNotice
          label="Asset favourites"
          status={assetSaves.syncStatus}
          error={assetSaves.syncError}
          onRetry={assetSaves.retrySync}
        />
        <SaveSyncNotice
          label="Website favourites"
          status={listSyncStatus}
          error={listSyncError}
          onRetry={retryListSync}
        />
        {!intelligence &&
          !utility &&
          query.view === 'assets' &&
          !hasFilters &&
          query.offset === 0 &&
          !query.id && <FeaturedCollections query={query} navigate={navigate} />}
        {intelligence ? (
          privateWorkspace && !settled ? (
            <p role="status">Checking account…</p>
          ) : privateWorkspace && !isCurator ? (
            <NotFound onReset={() => navigate({}, true)} />
          ) : (
            <RegistryIntelligence
              query={query}
              navigate={navigate}
              isCurator={isCurator}
              assetSaves={assetSaves}
            />
          )
        ) : utility ? (
          ['review', 'scout', 'jobs'].includes(query.view) && !settled ? (
            <p role="status">Checking account…</p>
          ) : ['review', 'scout', 'jobs'].includes(query.view) && !isCurator ? (
            <NotFound onReset={() => navigate({}, true)} />
          ) : (
            <AssetUtilities key={query.view} view={query.view} />
          )
        ) : (
          <AssetLibrary
            query={query}
            navigate={navigate}
            density={density}
            assetSaves={assetSaves}
            discovery={
              <DiscoveryControls
                assetSearch
                catalogue="assets"
                showDiscovery={!utility}
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
              />
            }
          />
        )}
        <p className="dv2-release-label">DISCOVERY V2 · SOURCE-BACKED ASSET REGISTRY</p>
        <SiteFooter count={null} assets>
          <nav aria-label="Asset workspace links">
            <a href="/browse/assets?view=collections">Asset collections</a>
            {isCurator && (
              <>
                <a href="/browse/assets?view=health">Registry health</a>
                <a href="/browse/assets?view=operations">Operations board</a>
                <a href="/browse/assets?view=collection-editor">Collection editorial</a>
              </>
            )}
            <a
              href="/browse/assets?view=guide"
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                navigate({ view: 'guide' }, true);
              }}
            >
              How to use UIXO
            </a>
            <a
              href="/browse/assets?view=connect"
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                navigate({ view: 'connect' }, true);
              }}
            >
              Connect your AI agent
            </a>
            {isCurator && (
              <a
                href="/admin"
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  navigateInApp('/admin');
                }}
              >
                Admin workspace
              </a>
            )}
          </nav>
        </SiteFooter>
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
