import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatedSidebarInset,
  AnimatedSidebarProvider,
} from './components/motion/animated-sidebar';
import { AccountMenu } from './components/AccountMenu';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminSidebar } from './components/AdminSidebar';
import { AppDialog } from './components/AppDialog';
import { CollectionsIndex } from './components/CollectionsIndex';
import { CommandPalette } from './components/CommandPalette';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { NotFound } from './components/NotFound';
import { ReviewInbox } from './components/ReviewInbox';
import { AppSidebar } from './components/AppSidebar';
import { DiscoveryToolbar } from './components/DiscoveryToolbar';
import { EmptyState } from './components/EmptyState';
import { PageHeading } from './components/PageHeading';
import { QuickView } from './components/QuickView';
import { ResourceGrid } from './components/ResourceGrid';
import { SiteFooter } from './components/SiteFooter';
import { SaveSyncNotice } from './components/SaveSyncNotice';
import { TopBar, DiscoveryControls } from './components/TopBar';
import { useAuth } from './hooks/useAuth';
import { useAssetSaves } from './hooks/useAssetSaves';
import { useDensity } from './hooks/useDensity';
import { useLists } from './hooks/useLists';
import { useDialog } from './hooks/useDialog';
import { useRoute } from './hooks/useRoute';
import { useSearchHotkey } from './hooks/useSearchHotkey';
import { useTheme } from './hooks/useTheme';
import { filterResources } from './lib/filters';
import { navigateInApp } from './lib/navigation';
import { EMPTY_ROUTE, routeToHref } from './lib/url';
import { collections, resources } from './data';
import { ALL_FORMATS } from './types';
import type { BrowseOrder, ModalName, PriceFilter } from './types';

const SIDEBAR_SIZING = {
  '--sidebar-width': '15.25rem',
  '--sidebar-width-icon': '4.25rem',
} as React.CSSProperties;

export function App() {
  const { route, navigate } = useRoute();
  const { light, toggle: toggleTheme } = useTheme();
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
    toggleSaved,
    toggleIn,
    create,
    remove,
    syncStatus: listSyncStatus,
    syncError: listSyncError,
    retrySync: retryListSync,
  } = useLists(user?.id ?? null, settled);
  const assetSaves = useAssetSaves(user?.id ?? null, settled);

  const [openSection, setOpenSection] = useState<string | null>(route.category);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState<ModalName | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { density, setDensity } = useDensity();

  const dialogRef = useDialog(modal !== null);
  const searchRef = useRef<HTMLInputElement>(null);
  useSearchHotkey(searchRef, !modal && !mobileOpen && !route.resourceId && !paletteOpen);

  // Cmd/Ctrl-K opens the palette from anywhere, including inside a text field.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const activeList = lists.find((entry) => entry.id === route.listId) ?? null;
  const activeCollection = collections.find((entry) => entry.slug === route.collectionSlug) ?? null;
  const openResource = resources.find((entry) => entry.id === route.resourceId) ?? null;

  // A list deleted while it was being viewed should not leave a dead route behind.
  useEffect(() => {
    if (route.listId && !activeList) navigate({ listId: null });
  }, [route.listId, activeList, navigate]);

  const shown = useMemo(
    () =>
      filterResources(resources, {
        listIds: activeCollection
          ? activeCollection.resourceIds
          : activeList
            ? activeList.resourceIds
            : null,
        category: route.category,
        sub: route.sub,
        price: route.price,
        format: route.format,
        browse: route.browse,
        search: route.search,
      }),
    [
      activeList,
      activeCollection,
      route.category,
      route.sub,
      route.price,
      route.format,
      route.browse,
      route.search,
    ],
  );

  const clearFilters = () =>
    navigate({ search: '', category: null, sub: null, price: 'All', format: ALL_FORMATS });

  const reset = () => navigate({ ...EMPTY_ROUTE });

  const showAll = () => {
    setOpenSection(null);
    navigate({ ...EMPTY_ROUTE, browse: route.browse });
  };

  const chooseList = (id: string) => {
    setOpenSection(null);
    navigate({ ...EMPTY_ROUTE, listId: id, browse: route.browse });
  };

  const chooseCategory = (name: string) => {
    setOpenSection((current) => (current === name ? null : name));
    navigate({ category: name, sub: null, listId: null, resourceId: null });
  };

  const chooseSub = (parent: string, child: string) => {
    setOpenSection(parent);
    navigate({ category: parent, sub: child, listId: null, resourceId: null });
  };

  const title = route.review
    ? 'Review inbox'
    : route.admin
      ? 'Admin workspace'
      : route.dashboard
        ? `Hello, ${user?.name.split(' ')[0] ?? 'there'}`
        : route.notFound
          ? 'Not found'
          : route.collectionsIndex
            ? 'Collections'
            : activeCollection
              ? activeCollection.name
              : route.sub || route.category || (activeList ? activeList.name : 'All websites');

  const subtitle = route.review
    ? 'Staged candidates. Nothing reaches the site until you approve it.'
    : route.admin
      ? 'Catalogue health, review queues, and source operations.'
      : route.dashboard
        ? 'Your lists, your submissions, and what needs attention.'
        : route.notFound
          ? 'We could not find that page.'
          : route.collectionsIndex
            ? 'Curated sets with a point of view.'
            : activeCollection
              ? activeCollection.tagline
              : activeList
                ? 'The good ones, kept close.'
                : 'Good tools. Great interfaces.';

  // The grid and its toolbar only make sense on browsing routes.
  const showsGrid =
    !route.dashboard && !route.admin && !route.review && !route.notFound && !route.collectionsIndex;

  const hasFilters =
    Boolean(route.search || route.category) ||
    route.price !== 'All' ||
    route.format !== ALL_FORMATS;
  const adminMode = route.admin && isCurator;

  if (route.landing) {
    return (
      <>
        <LandingPage
          authAvailable={authAvailable}
          signedIn={Boolean(user)}
          hrefs={{
            browse: routeToHref(EMPTY_ROUTE),
            collections: routeToHref({ ...EMPTY_ROUTE, collectionsIndex: true }),
            collection: (slug) => routeToHref({ ...EMPTY_ROUTE, collectionSlug: slug }),
            resource: (id) => routeToHref({ ...EMPTY_ROUTE, resourceId: id }),
          }}
          onBrowse={() => navigate({ ...EMPTY_ROUTE })}
          onCollections={() => navigate({ ...EMPTY_ROUTE, collectionsIndex: true })}
          onOpenCollection={(collectionSlug) => navigate({ ...EMPTY_ROUTE, collectionSlug })}
          onOpenResource={(resourceId) => navigate({ ...EMPTY_ROUTE, resourceId })}
          onSignIn={() => setModal('signin')}
          onAbout={() => setModal('about')}
        />
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
      </>
    );
  }

  return (
    <AnimatedSidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      openMobile={mobileOpen}
      onOpenMobileChange={setMobileOpen}
      style={SIDEBAR_SIZING}
    >
      {adminMode ? (
        <AdminSidebar
          onExit={showAll}
          onWebsiteReview={() => navigate({ ...EMPTY_ROUTE, review: true })}
          onAssetReview={() => navigateInApp('/browse/assets?view=review')}
          onScout={() => navigateInApp('/browse/assets?view=scout')}
          onJobs={() => navigateInApp('/browse/assets?view=jobs')}
        />
      ) : (
        <AppSidebar
          category={route.category}
          sub={route.sub}
          listId={route.listId}
          openSection={openSection}
          lists={lists}
          onShowAll={showAll}
          homeHref={routeToHref(EMPTY_ROUTE)}
          onShowCollections={() => {
            setOpenSection(null);
            navigate({ ...EMPTY_ROUTE, collectionsIndex: true });
          }}
          onCollections={route.collectionsIndex || Boolean(activeCollection)}
          onChooseList={chooseList}
          onDeleteList={remove}
          onChooseCategory={chooseCategory}
          onChooseSub={chooseSub}
          onSubmit={() => setModal('submit')}
          savedAssetCount={assetSaves.saved.length}
        />
      )}

      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <AnimatedSidebarInset className="site-main" id="main" tabIndex={-1}>
        <TopBar
          catalogue={route.collectionsIndex || activeCollection ? 'collections' : 'websites'}
          light={light}
          onToggleTheme={toggleTheme}
          onOpenModal={setModal}
          adminMode={adminMode}
          adminAction={
            isCurator
              ? adminMode
                ? { label: 'Exit admin', href: '/browse', onSelect: showAll }
                : {
                    label: 'Admin',
                    href: routeToHref({ ...EMPTY_ROUTE, admin: true }),
                    onSelect: () => navigate({ ...EMPTY_ROUTE, admin: true }),
                  }
              : undefined
          }
          account={
            <AccountMenu
              available={authAvailable}
              settled={settled}
              user={user}
              onSignIn={() => setModal('signin')}
              onDashboard={() => navigate({ ...EMPTY_ROUTE, dashboard: true })}
              onAdmin={() => navigate({ ...EMPTY_ROUTE, admin: true })}
              onSignOut={signOut}
              dashboardHref={routeToHref({ ...EMPTY_ROUTE, dashboard: true })}
              adminHref={routeToHref({ ...EMPTY_ROUTE, admin: true })}
            />
          }
        />

        <PageHeading
          title={title}
          subtitle={subtitle}
          canClear={hasFilters}
          onClear={clearFilters}
        />

        <SaveSyncNotice
          label="Website favourites"
          status={listSyncStatus}
          error={listSyncError}
          onRetry={retryListSync}
        />
        <SaveSyncNotice
          label="Asset favourites"
          status={assetSaves.syncStatus}
          error={assetSaves.syncError}
          onRetry={assetSaves.retrySync}
        />

        {activeCollection && <p className="collection-lede">{activeCollection.description}</p>}

        {showsGrid && (
          <DiscoveryToolbar
            browse={route.browse}
            onBrowseChange={(browse: BrowseOrder) => navigate({ browse })}
            format={route.format}
            onFormatChange={(format) => navigate({ format })}
            density={density}
            onDensityChange={setDensity}
          />
        )}

        <DiscoveryControls
          catalogue={route.collectionsIndex || activeCollection ? 'collections' : 'websites'}
          collectionIndex={route.collectionsIndex}
          showDiscovery={showsGrid || route.collectionsIndex}
          searchRef={searchRef}
          search={route.search}
          onSearchChange={(search) => navigate({ search })}
          price={route.price}
          onPriceChange={(price: PriceFilter) => navigate({ price })}
        />

        {/* Announce result counts so filtering is not silent to a screen reader. */}
        <p className="sr-only" role="status" aria-live="polite">
          {showsGrid ? `${shown.length} website${shown.length === 1 ? '' : 's'} shown` : ''}
        </p>

        {route.notFound && <NotFound onReset={reset} />}

        {route.collectionsIndex && (
          <CollectionsIndex
            search={route.search}
            onOpen={(collectionSlug) => navigate({ ...EMPTY_ROUTE, collectionSlug })}
            href={(slug) => routeToHref({ ...EMPTY_ROUTE, collectionSlug: slug })}
          />
        )}

        {route.review && (!authAvailable || !isCurator) && <NotFound onReset={reset} />}
        {route.review && authAvailable && isCurator && user && <ReviewInbox user={user} />}

        {route.admin && (!authAvailable || !isCurator) && <NotFound onReset={reset} />}
        {route.admin && authAvailable && isCurator && user && (
          <AdminDashboard
            user={user}
            onOpenResource={(resourceId) => navigate({ ...EMPTY_ROUTE, resourceId })}
            onOpenWebsiteReview={() => navigate({ ...EMPTY_ROUTE, review: true })}
          />
        )}

        {route.dashboard && !authAvailable && <NotFound onReset={reset} />}

        {route.dashboard &&
          authAvailable &&
          (user ? (
            <Dashboard
              user={user}
              isCurator={isCurator}
              lists={lists}
              savedAssetCount={assetSaves.saved.length}
              onOpenList={chooseList}
              onOpenResource={(resourceId) => navigate({ ...EMPTY_ROUTE, resourceId })}
              onSubmit={() => setModal('submit')}
              onReview={() => navigate({ ...EMPTY_ROUTE, review: true })}
              reviewHref={routeToHref({ ...EMPTY_ROUTE, review: true })}
            />
          ) : (
            <section className="empty">
              <h2>Sign in to see your dashboard.</h2>
              <p>Your lists, submissions and review queue live here.</p>
              <button onClick={() => setModal('signin')}>Sign in</button>
            </section>
          ))}

        {showsGrid && (
          <>
            <ResourceGrid
              density={density}
              resources={shown}
              lists={lists}
              onOpen={(resourceId) => navigate({ resourceId })}
              onToggleSaved={toggleSaved}
              onSelectCategory={chooseCategory}
              onSelectFormat={(format) => navigate({ format })}
            />

            {!shown.length && (
              <EmptyState
                emptyList={Boolean(activeList && !activeList.resourceIds.length)}
                onReset={reset}
              />
            )}
          </>
        )}

        <SiteFooter count={showsGrid ? shown.length : null} />
      </AnimatedSidebarInset>

      <QuickView
        key={route.resourceId ?? 'closed'}
        resource={openResource}
        lists={lists}
        onClose={() => navigate({ resourceId: null })}
        onToggleIn={toggleIn}
        onCreateList={create}
        onSelectCategory={chooseCategory}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenResource={(resourceId) => navigate({ resourceId })}
        onOpenCategory={chooseCategory}
        onOpenCollection={(collectionSlug) => navigate({ ...EMPTY_ROUTE, collectionSlug })}
      />

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
