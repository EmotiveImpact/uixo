import { ResourceCard } from './ResourceCard';
import { routeToHref, EMPTY_ROUTE } from '../lib/url';
import type { List, Resource } from '../types';
import type { Density } from '../hooks/useDensity';
import { isSavedAnywhere } from '../lib/lists';

type ResourceGridProps = {
  resources: Resource[];
  density: Density;
  lists: List[];
  onOpen: (id: string) => void;
  onToggleSaved: (id: string) => void;
  onSelectCategory: (category: string) => void;
  onSelectFormat: (format: string) => void;
};

export function ResourceGrid({
  resources,
  density,
  lists,
  onOpen,
  onToggleSaved,
  onSelectCategory,
  onSelectFormat,
}: ResourceGridProps) {
  return (
    <section className={`website-grid density-${density}`} aria-label="Websites">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          href={routeToHref({ ...EMPTY_ROUTE, resourceId: resource.id })}
          isSaved={isSavedAnywhere(lists, resource.id)}
          onOpen={onOpen}
          onToggleSaved={onToggleSaved}
          onSelectCategory={onSelectCategory}
          onSelectFormat={onSelectFormat}
        />
      ))}
    </section>
  );
}
