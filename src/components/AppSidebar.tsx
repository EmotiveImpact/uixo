import {
  Blocks,
  Box,
  Grid2X2,
  Heart,
  Layers3,
  PanelLeft,
  Plus,
  Shapes,
  Trash2,
  X,
} from 'lucide-react';
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarMenuSub,
  AnimatedSidebarMenuSubButton,
  AnimatedSidebarMenuSubItem,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
} from './motion/animated-sidebar';
import { categories, collections, resources } from '../data';
import { categoryCount, populatedSubs } from '../lib/filters';
import { navigateInApp } from '../lib/navigation';
import { DEFAULT_LIST_ID } from '../types';
import type { List } from '../types';
import type { ProviderRecord } from '../lib/asset-library';

type AppSidebarProps = {
  category: string | null;
  sub: string | null;
  listId: string | null;
  openSection: string | null;
  lists: List[];
  onShowAll: () => void;
  /** Where the wordmark points: the directory root, not the landing page. */
  homeHref: string;
  onShowCollections: () => void;
  onCollections: boolean;
  onChooseList: (id: string) => void;
  onDeleteList: (id: string) => void;
  onChooseCategory: (name: string) => void;
  onChooseSub: (category: string, sub: string) => void;
  onSubmit: () => void;
  onAssets?: boolean;
  onShowAssets?: () => void;
  onSavedAssets?: boolean;
  onShowSavedAssets?: () => void;
  savedAssetCount?: number;
  assetKind?: string;
  onChooseAssetKind?: (kind: string) => void;
  assetProvider?: string;
  assetProviders?: ProviderRecord[];
  onChooseAssetProvider?: (provider: string) => void;
};

export function AppSidebar({
  category,
  sub,
  listId,
  openSection,
  lists,
  onShowAll,
  homeHref,
  onShowCollections,
  onCollections,
  onChooseList,
  onDeleteList,
  onChooseCategory,
  onChooseSub,
  onSubmit,
  onAssets = false,
  onShowAssets = () => navigateInApp('/browse/assets'),
  onSavedAssets = false,
  onShowSavedAssets = () => navigateInApp('/browse/assets?view=saved'),
  savedAssetCount = 0,
  assetKind = '',
  onChooseAssetKind,
  assetProvider = '',
  assetProviders = [],
  onChooseAssetProvider,
}: AppSidebarProps) {
  const favourites = lists.find((list) => list.id === DEFAULT_LIST_ID);
  const componentCount = assetProviders
    .filter((provider) => provider.adapter !== 'github-icons')
    .reduce((total, provider) => total + provider.assetCount, 0);
  const iconCount = assetProviders
    .filter((provider) => provider.adapter === 'github-icons')
    .reduce((total, provider) => total + provider.assetCount, 0);
  const assetCount = componentCount + iconCount;
  return (
    <AnimatedSidebar ariaLabel="UIXO navigation" collapsible="icon">
      <AnimatedSidebarHeader className="p-3 pb-2">
        <div className="flex min-h-11 items-center gap-3 overflow-hidden px-2">
          <a
            href={homeHref}
            aria-label="UIXO — all websites"
            className="brand"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey) return;
              event.preventDefault();
              onShowAll();
            }}
          >
            <span className="group-data-[state=collapsed]/sidebar:hidden">UIXO</span>
            <span className="hidden group-data-[state=collapsed]/sidebar:block">U</span>
          </a>
          <AnimatedSidebarTrigger
            className="sidebar-header-toggle ml-auto hidden md:grid"
            aria-label="Toggle navigation"
          >
            <PanelLeft className="size-4" />
          </AnimatedSidebarTrigger>
          <AnimatedSidebarClose className="ml-auto md:hidden">
            <X className="size-4" />
          </AnimatedSidebarClose>
        </div>
      </AnimatedSidebarHeader>

      <AnimatedSidebarContent className="px-2 pt-1">
        <AnimatedSidebarGroup className="pb-5 pt-5">
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<Grid2X2 className="size-4" />}
                  badge={String(resources.length)}
                  isActive={!category && !listId && !onCollections && !onAssets}
                  onSelect={onShowAll}
                >
                  All websites
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<Shapes className="size-4" />}
                  badge={assetCount ? String(assetCount) : undefined}
                  isActive={onAssets}
                  onSelect={onShowAssets}
                >
                  All assets
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<Layers3 className="size-4" />}
                  badge={String(collections.length)}
                  isActive={onCollections}
                  onSelect={onShowCollections}
                >
                  Collections
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>

        <AnimatedSidebarGroup className="pt-4">
          <AnimatedSidebarGroupLabel>Favourites</AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<Heart className="size-4" />}
                  badge={String(favourites?.resourceIds.length ?? 0)}
                  isActive={!onAssets && listId === DEFAULT_LIST_ID}
                  onSelect={() => onChooseList(DEFAULT_LIST_ID)}
                  aria-label="Favourite websites"
                >
                  Websites
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<Shapes className="size-4" />}
                  badge={String(savedAssetCount)}
                  isActive={onSavedAssets}
                  onSelect={onShowSavedAssets}
                  aria-label="Favourite assets"
                >
                  Assets
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>
        {onAssets && onChooseAssetKind && (
          <AnimatedSidebarGroup className="pt-2">
            <AnimatedSidebarGroupLabel>Asset types</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                {[
                  { id: 'component', label: 'Components', icon: Blocks, count: componentCount },
                  { id: 'icon', label: 'Icons', icon: Shapes, count: iconCount },
                ].map(({ id, label, icon: Icon, count }) => (
                  <AnimatedSidebarMenuItem key={id}>
                    <AnimatedSidebarMenuButton
                      icon={<Icon className="size-4" />}
                      badge={count ? String(count) : undefined}
                      isActive={assetKind === id}
                      onSelect={() => onChooseAssetKind(id)}
                    >
                      {label}
                    </AnimatedSidebarMenuButton>
                  </AnimatedSidebarMenuItem>
                ))}
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        )}
        {lists.some((list) => list.id !== DEFAULT_LIST_ID) && (
          <AnimatedSidebarGroup className="border-t border-border pt-4">
            <AnimatedSidebarGroupLabel>Your lists</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                {lists
                  .filter((list) => list.id !== DEFAULT_LIST_ID)
                  .map((list) => (
                    <AnimatedSidebarMenuItem key={list.id}>
                      <div className="list-row">
                        <AnimatedSidebarMenuButton
                          icon={<Heart className="size-4" />}
                          badge={String(list.resourceIds.length)}
                          isActive={listId === list.id}
                          onSelect={() => onChooseList(list.id)}
                        >
                          {list.name}
                        </AnimatedSidebarMenuButton>
                        {list.id !== DEFAULT_LIST_ID && (
                          <button
                            className="list-delete group-data-[state=collapsed]/sidebar:hidden"
                            aria-label={`Delete list ${list.name}`}
                            onClick={() => onDeleteList(list.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </AnimatedSidebarMenuItem>
                  ))}
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        )}

        {onAssets ? (
          <AnimatedSidebarGroup className="border-t border-border pt-4">
            <AnimatedSidebarGroupLabel>Sources</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                {assetProviders.map((provider) => (
                  <AnimatedSidebarMenuItem key={provider.id}>
                    <AnimatedSidebarMenuButton
                      icon={
                        provider.adapter === 'github-icons' ? (
                          <Shapes className="size-4" />
                        ) : (
                          <Box className="size-4" />
                        )
                      }
                      badge={String(provider.assetCount)}
                      isActive={assetProvider === provider.id}
                      onSelect={() => onChooseAssetProvider?.(provider.id)}
                    >
                      {provider.name}
                    </AnimatedSidebarMenuButton>
                  </AnimatedSidebarMenuItem>
                ))}
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        ) : (
          <AnimatedSidebarGroup className="border-t border-border pt-4">
            <AnimatedSidebarGroupLabel>Categories</AnimatedSidebarGroupLabel>
            <AnimatedSidebarGroupContent>
              <AnimatedSidebarMenu>
                {categories.map((entry) => {
                  const Icon = entry.icon;
                  // Subcategories with nothing in them are hidden rather than shown as dead ends.
                  const subs = populatedSubs(resources, entry);
                  return (
                    <AnimatedSidebarMenuItem key={entry.name}>
                      <AnimatedSidebarMenuButton
                        icon={<Icon className="size-4" />}
                        badge={String(categoryCount(resources, entry))}
                        isActive={category === entry.name}
                        ariaExpanded={subs.length ? openSection === entry.name : undefined}
                        onSelect={() => onChooseCategory(entry.name)}
                      >
                        {entry.name}
                      </AnimatedSidebarMenuButton>
                      {subs.length > 0 && (
                        <AnimatedSidebarMenuSub open={openSection === entry.name}>
                          {subs.map((child) => (
                            <AnimatedSidebarMenuSubItem key={child}>
                              <AnimatedSidebarMenuSubButton
                                isActive={category === entry.name && sub === child}
                                onSelect={() => onChooseSub(entry.name, child)}
                              >
                                {child}
                              </AnimatedSidebarMenuSubButton>
                            </AnimatedSidebarMenuSubItem>
                          ))}
                        </AnimatedSidebarMenuSub>
                      )}
                    </AnimatedSidebarMenuItem>
                  );
                })}
              </AnimatedSidebarMenu>
            </AnimatedSidebarGroupContent>
          </AnimatedSidebarGroup>
        )}
      </AnimatedSidebarContent>

      <AnimatedSidebarFooter className="gap-3 border-none p-3">
        <AnimatedSidebarMenu>
          <AnimatedSidebarMenuItem>
            <AnimatedSidebarMenuButton icon={<Plus className="size-4" />} onSelect={onSubmit}>
              Submit a website
            </AnimatedSidebarMenuButton>
          </AnimatedSidebarMenuItem>
        </AnimatedSidebarMenu>
        <p className="sidebar-note group-data-[state=collapsed]/sidebar:hidden">
          Curated for the curious.
          <br />A little corner of the internet.
        </p>
      </AnimatedSidebarFooter>
      <AnimatedSidebarRail />
    </AnimatedSidebar>
  );
}
