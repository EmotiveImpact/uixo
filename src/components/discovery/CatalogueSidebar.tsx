import {
  Blocks,
  Bookmark,
  ChevronDown,
  Globe,
  House,
  Layers,
  Plus,
  Shapes,
  Terminal,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { CATEGORY_HUES } from '../../lib/stage-hue';
import type { AppSidebarProps } from '../AppSidebar';
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
} from '../motion/animated-sidebar';
import { COMPONENT_CATEGORIES } from '../../../shared/component-categories';
import { useRegistryData } from '../../hooks/useRegistryData';
import type { CatalogueInventory } from '../../lib/asset-library';
import { categories, resources } from '../../data';
import { categoryCount, populatedSubs } from '../../lib/filters';
import { navigateInApp } from '../../lib/navigation';
import { DEFAULT_LIST_ID } from '../../types';

function AssetFilters(props: AppSidebarProps) {
  const { data } = useRegistryData<CatalogueInventory>('inventory');
  const query = props.assetQuery;
  const count = (facet: 'kinds' | 'categories' | 'frameworks', id: string) =>
    data?.[facet]?.find((item) => item.id === id)?.count;
  const number = (value: number | undefined) => value?.toLocaleString('en-GB');
  const showComponentCategories = !props.assetKind || props.assetKind === 'component';
  const view = props.assetView ?? 'assets';
  return (
    <>
      <div className="filter-section">
        <h2>Browse</h2>
        <a
          className="filter-link"
          href="/"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            navigateInApp('/');
          }}
        >
          <House size={15} />
          <span>Home</span>
        </a>
        {[
          { id: 'component', label: 'Components', icon: Blocks },
          { id: 'icon-pack', label: 'Icon packs', icon: Shapes },
          { id: 'font', label: 'Fonts', icon: Type },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={
              view === 'assets' &&
              !props.assetCategory &&
              (props.assetKind === id || (id === 'component' && !props.assetKind))
                ? 'chosen'
                : ''
            }
            onClick={() => props.onChooseAssetKind?.(id)}
          >
            <Icon size={15} />
            <span>{label}</span>
            <small>{number(count('kinds', id))}</small>
          </button>
        ))}
        <a
          className="filter-link"
          href="/browse"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            navigateInApp('/browse');
          }}
        >
          <Globe size={15} />
          <span>Websites and libraries</span>
        </a>
      </div>
      {showComponentCategories && (
        <div className="filter-section">
          <h2>Categories</h2>
          {COMPONENT_CATEGORIES.map((item) => (
            <button
              key={item.id}
              className={props.assetCategory === item.id ? 'chosen' : ''}
              onClick={() => props.onChooseAssetCategory?.(item.id)}
            >
              <span
                className="filter-dot"
                style={{ '--h': CATEGORY_HUES[item.id] ?? 250 } as CSSProperties}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              <small>{number(count('categories', item.id))}</small>
            </button>
          ))}
        </div>
      )}
      <details className="filter-section filter-facets">
        <summary>
          Framework <ChevronDown size={12} />
        </summary>
        {['react', 'vue', 'html', 'agnostic']
          .filter((id) => (count('frameworks', id) ?? 0) > 0)
          .map((id) => (
            <button
              key={id}
              aria-pressed={query?.framework === id}
              onClick={() =>
                props.onNavigateAssets?.({
                  framework: query?.framework === id ? '' : id,
                  offset: 0,
                  id: '',
                })
              }
            >
              <span className="filter-check" />
              <span>
                {id === 'agnostic'
                  ? 'Any framework'
                  : id === 'html'
                    ? 'HTML / CSS'
                    : id.charAt(0).toUpperCase() + id.slice(1)}
              </span>
              <small>{number(count('frameworks', id))}</small>
            </button>
          ))}
      </details>
      <details className="filter-section filter-facets">
        <summary>
          Source <ChevronDown size={12} />
        </summary>
        {props.assetProviders?.map((provider) => (
          <button
            key={provider.id}
            aria-pressed={query?.provider === provider.id}
            onClick={() =>
              props.onNavigateAssets?.({
                provider: query?.provider === provider.id ? '' : provider.id,
                offset: 0,
                id: '',
              })
            }
          >
            <span className="filter-check" />
            <span>{provider.name}</span>
            <small>{number(provider.assetCount)}</small>
          </button>
        ))}
      </details>
    </>
  );
}

/** Public catalogue filters. Operator tools remain in the original protected workspace. */
export function CatalogueSidebar(props: AppSidebarProps) {
  return (
    <AnimatedSidebar
      ariaLabel="UIXO navigation"
      collapsible="offcanvas"
      className="discovery-sidebar"
    >
      <AnimatedSidebarContent>
        <div className="filter-mobile-head">
          <span>Browse & filter</span>
          <AnimatedSidebarClose aria-label="Close sidebar">
            <X size={18} />
          </AnimatedSidebarClose>
        </div>
        {props.onAssets ? (
          <AssetFilters {...props} />
        ) : (
          <div className="filter-section">
            <h2>Browse</h2>
            <button
              className={!props.category && !props.listId ? 'chosen' : ''}
              onClick={props.onShowAll}
            >
              <Shapes size={15} />
              <span>{props.allLabel ?? 'All resources'}</span>
              <small>{(props.catalogueResources ?? resources).length}</small>
            </button>
            {categories.map((item) => (
              <div key={item.name}>
                <button
                  className={props.category === item.name ? 'chosen' : ''}
                  onClick={() => props.onChooseCategory(item.name)}
                >
                  <item.icon className="filter-category-icon" />
                  <span>{item.name}</span>
                  <small>
                    {categoryCount(
                      props.catalogueResources ?? resources,
                      item,
                      props.exactTaxonomy,
                    )}
                  </small>
                </button>
                {props.openSection === item.name &&
                  populatedSubs(
                    props.catalogueResources ?? resources,
                    item,
                    props.exactTaxonomy,
                  ).map((sub) => (
                    <button
                      className={`filter-sub ${props.sub === sub ? 'chosen' : ''}`}
                      key={sub}
                      onClick={() => props.onChooseSub(item.name, sub)}
                    >
                      {sub}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
        <div className="filter-section filter-explore">
          <h2>Your library</h2>
          <button
            className={props.onSavedAssets ? 'chosen' : ''}
            onClick={() =>
              props.onShowSavedAssets
                ? props.onShowSavedAssets()
                : navigateInApp('/browse/assets?view=saved')
            }
          >
            <Bookmark size={15} />
            <span>Saved</span>
            <small>
              {(props.savedAssetCount ?? 0) +
                (props.lists.find((list) => list.id === DEFAULT_LIST_ID)?.resourceIds.length ??
                  0) || ''}
            </small>
          </button>
          <button
            aria-label="Asset collections"
            className={props.assetView === 'collections' ? 'chosen' : ''}
            onClick={() =>
              props.onChooseAssetView
                ? props.onChooseAssetView('collections')
                : navigateInApp('/browse/assets?view=collections')
            }
          >
            <Layers size={15} />
            <span>Collections</span>
          </button>
        </div>
        <div className="filter-section filter-explore">
          <h2>For developers</h2>
          <button
            aria-label="Connect your AI agent"
            className={props.assetView === 'connect' ? 'chosen' : ''}
            onClick={() =>
              props.onChooseAssetView
                ? props.onChooseAssetView('connect')
                : navigateInApp('/browse/assets?view=connect')
            }
          >
            <Terminal size={15} />
            <span>Connect your AI agent</span>
          </button>
          <button
            aria-label="Component sources"
            className={props.assetView === 'sources' ? 'chosen' : ''}
            onClick={() =>
              props.onChooseAssetView
                ? props.onChooseAssetView('sources')
                : navigateInApp('/browse/assets?view=sources')
            }
          >
            <Blocks size={15} />
            <span>Component sources</span>
          </button>
        </div>
        {props.lists.some((list) => list.id !== DEFAULT_LIST_ID) && (
          <div className="filter-section filter-custom-lists">
            <h2>Your lists</h2>
            {props.lists
              .filter((list) => list.id !== DEFAULT_LIST_ID)
              .map((list) => (
                <div className="filter-list-row" key={list.id}>
                  <button
                    className={props.listId === list.id ? 'chosen' : ''}
                    onClick={() => props.onChooseList(list.id)}
                  >
                    <Bookmark size={14} />
                    <span>{list.name}</span>
                    <small>{list.resourceIds.length}</small>
                  </button>
                  <button
                    className="filter-list-delete"
                    aria-label={`Delete list ${list.name}`}
                    onClick={() => props.onDeleteList(list.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
          </div>
        )}
        <div className="filter-foot">
          <button className="filter-submit" onClick={props.onSubmit}>
            <Plus size={15} /> Submit a resource
          </button>
          {props.onSignIn && (
            <button className="filter-signin" onClick={props.onSignIn}>
              Sign in
            </button>
          )}
        </div>
      </AnimatedSidebarContent>
    </AnimatedSidebar>
  );
}
