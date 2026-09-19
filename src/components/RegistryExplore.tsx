import { Activity, BookOpen, Boxes, Database, Layers, Terminal, Workflow } from 'lucide-react';
import type { AssetQuery } from '../lib/asset-library';
import {
  AnimatedSidebarGroup,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarGroupContent,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuItem,
  AnimatedSidebarMenuButton,
} from './motion/animated-sidebar';

export const EXPLORE_VIEWS = [
  { view: 'assets', label: 'All assets', icon: Boxes },
  { view: 'collections', label: 'Asset collections', icon: Layers },
  { view: 'sources', label: 'Sources', icon: Database },
] as const;
export const CURATOR_VIEWS = [
  { view: 'health', label: 'Registry health', icon: Activity },
  { view: 'operations', label: 'Operations', icon: Workflow },
  { view: 'collection-editor', label: 'Editorial', icon: BookOpen },
  { view: 'jobs', label: 'Indexing', icon: Database },
] as const;

export function RegistryExplore({
  view,
  isCurator = false,
  onChoose,
}: {
  view: AssetQuery['view'] | null;
  isCurator?: boolean;
  onChoose: (view: AssetQuery['view']) => void;
}) {
  return (
    <>
      <AnimatedSidebarGroup className="pt-2">
        <AnimatedSidebarGroupLabel>Explore</AnimatedSidebarGroupLabel>
        <AnimatedSidebarGroupContent>
          <AnimatedSidebarMenu>
            {EXPLORE_VIEWS.map((entry) => (
              <AnimatedSidebarMenuItem key={entry.view}>
                <AnimatedSidebarMenuButton
                  icon={<entry.icon className="size-4" />}
                  isActive={view === entry.view}
                  aria-label={entry.label}
                  onSelect={() => onChoose(entry.view)}
                >
                  {entry.label}
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            ))}
            <AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuButton
                icon={<Terminal className="size-4" />}
                isActive={view === 'connect'}
                aria-label="Connect your AI agent"
                onSelect={() => onChoose('connect')}
              >
                Connect your AI agent
              </AnimatedSidebarMenuButton>
            </AnimatedSidebarMenuItem>
          </AnimatedSidebarMenu>
        </AnimatedSidebarGroupContent>
      </AnimatedSidebarGroup>
      {isCurator && (
        <AnimatedSidebarGroup className="border-t border-border pt-4">
          <AnimatedSidebarGroupLabel>Registry workspace</AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              {CURATOR_VIEWS.map((entry) => (
                <AnimatedSidebarMenuItem key={entry.view}>
                  <AnimatedSidebarMenuButton
                    icon={<entry.icon className="size-4" />}
                    isActive={view === entry.view}
                    aria-label={entry.label}
                    onSelect={() => onChoose(entry.view)}
                  >
                    {entry.label}
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              ))}
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>
      )}
    </>
  );
}
