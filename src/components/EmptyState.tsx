import { Search } from 'lucide-react';

type EmptyStateProps = {
  /** True only when viewing a list that has nothing saved in it yet. */
  emptyList: boolean;
  onReset: () => void;
};

export function EmptyState({ emptyList, onReset }: EmptyStateProps) {
  return (
    <section className="empty">
      <Search size={26} />
      <h2>Nothing here just yet.</h2>
      <p>
        {emptyList
          ? 'Open a website and save it here to start this list.'
          : 'Try another search, category, format, or pricing filter.'}
      </p>
      <button onClick={onReset}>Show all websites</button>
    </section>
  );
}
