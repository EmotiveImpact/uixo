import {
  ArrowUpRight,
  Blocks,
  Bookmark,
  ChevronDown,
  Layers,
  Plus,
  Shapes,
  Terminal,
  Trash2,
  Type,
  X,
} from 'lucide-react';
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
  const showComponentCategories = !props.assetKind || props.assetKind === 'component';
  return (
    <>
      <div className="filter-section">
        <h2>Browse</h2>
        <button
          className={!props.assetKind && !props.assetCategory ? 'chosen' : ''}
          onClick={() => props.onChooseAssetView?.('assets')}
          aria-label="All assets"
        >
          <Blocks size={15} />
          <span>All assets</span>
          <small>{data?.total}</small>
        </button>
        {[
          { id: 'component', label: 'Components', icon: Blocks },
          { id: 'icon-pack', label: 'Icon packs', icon: Shapes },
          { id: 'font', label: 'Fonts', icon: Type },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={props.assetKind === id && !props.assetCategory ? 'chosen' : ''}
            onClick={() => props.onChooseAssetKind?.(id)}
          >
            <Icon size={15} />
            <span>{label}</span>
            <small>{count('kinds', id)}</small>
          </button>
        ))}
        {showComponentCategories &&
          COMPONENT_CATEGORIES.map((item) => (
            <button
              key={item.id}
              className={props.assetCategory === item.id ? 'chosen' : ''}
              onClick={() => props.onChooseAssetCategory?.(item.id)}
            >
              <span className="filter-dot" />
              <span>{item.label}</span>
              <small>{count('categories', item.id)}</small>
            </button>
          ))}
      </div>
      <details className="filter-section" open>
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
              <small>{count('frameworks', id)}</small>
            </button>
          ))}
      </details>
      <details className="filter-section" open>
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
            <small>{provider.assetCount}</small>
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
              <span>All resources</span>
              <small>{resources.length}</small>
            </button>
            {categories.map((item) => (
              <div key={item.name}>
                <button
                  className={props.category === item.name ? 'chosen' : ''}
                  onClick={() => props.onChooseCategory(item.name)}
                >
                  <item.icon className="filter-category-icon" />
                  <span>{item.name}</span>
                  <small>{categoryCount(resources, item)}</small>
                </button>
                {props.openSection === item.name &&
                  populatedSubs(resources, item).map((sub) => (
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
          <h2>Your workspace</h2>
          <button
            onClick={() =>
              props.onShowSavedAssets
                ? props.onShowSavedAssets()
                : navigateInApp('/browse/assets?view=saved')
            }
          >
            <Bookmark size={15} />
            <span>Saved assets</span>
            <small>{props.savedAssetCount || ''}</small>
          </button>
          <button
            aria-label="Favourite websites"
            onClick={() => props.onChooseList(DEFAULT_LIST_ID)}
          >
            <Bookmark size={15} />
            <span>Saved resources</span>
          </button>
          <button
            aria-label="Asset collections"
            onClick={() =>
              props.onChooseAssetView
                ? props.onChooseAssetView('collections')
                : navigateInApp('/browse/assets?view=collections')
            }
          >
            <Layers size={15} />
            <span>Collections</span>
          </button>
          <button
            aria-label="Sources"
            onClick={() =>
              props.onChooseAssetView
                ? props.onChooseAssetView('sources')
                : navigateInApp('/browse/assets?view=sources')
            }
          >
            <Blocks size={15} />
            <span>UI libraries</span>
            <ArrowUpRight size={12} />
          </button>
          <button
            aria-label="Connect your AI agent"
            onClick={() => navigateInApp('/browse/assets?view=connect')}
          >
            <Terminal size={15} />
            <span>For developers</span>
            <ArrowUpRight size={12} />
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
        <button className="filter-submit" onClick={props.onSubmit}>
          <Plus size={15} /> Submit a resource
        </button>
      </AnimatedSidebarContent>
    </AnimatedSidebar>
  );
}
