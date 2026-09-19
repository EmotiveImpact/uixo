import { ArrowUpRight } from 'lucide-react';
import { collections, resources, thumbnailPosition } from '../data';

type CollectionsIndexProps = {
  search?: string;
  onOpen: (slug: string) => void;
  href: (slug: string) => string;
};

export function CollectionsIndex({ onOpen, href, search = '' }: CollectionsIndexProps) {
  const query = search.trim().toLowerCase();
  const shown = collections.filter((collection) =>
    `${collection.name} ${collection.tagline} ${collection.description}`
      .toLowerCase()
      .includes(query),
  );
  return (
    <section className="collection-index" aria-label="Collections">
      <p>
        <a href="/browse/assets?view=collections">
          Explore curated asset collections <ArrowUpRight size={14} />
        </a>
      </p>
      {shown.length === 0 && <p role="status">No collections match your search.</p>}
      {shown.map((collection) => {
        const covers = collection.resourceIds
          .map((id) => resources.find((resource) => resource.id === id))
          .filter(Boolean)
          .slice(0, 4);

        return (
          <a
            key={collection.slug}
            className="collection-card"
            href={href(collection.slug)}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey) return;
              event.preventDefault();
              onOpen(collection.slug);
            }}
          >
            <div className="collection-covers" aria-hidden="true">
              {covers.map((resource) => (
                <img
                  key={resource!.id}
                  src={`/assets/${resource!.id}.png`}
                  alt=""
                  loading="lazy"
                  style={{ objectPosition: thumbnailPosition(resource!.id) }}
                />
              ))}
            </div>
            <h2>
              {collection.name}
              <ArrowUpRight size={16} />
            </h2>
            <p className="collection-tagline">{collection.tagline}</p>
            <p className="collection-count">
              {collection.resourceIds.length} website
              {collection.resourceIds.length === 1 ? '' : 's'}
            </p>
          </a>
        );
      })}
    </section>
  );
}
