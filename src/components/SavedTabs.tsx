import type { KeyboardEvent } from 'react';

type SavedTab = '' | 'websites';

/** The Saved page's two tabs, each with its count. */
export function SavedTabs({
  tab,
  components,
  websites,
  onChoose,
}: {
  tab: SavedTab;
  components: number;
  websites: number;
  onChoose: (tab: SavedTab) => void;
}) {
  const tabs: { id: SavedTab; key: string; label: string; count: number }[] = [
    { id: '', key: 'components', label: 'Components', count: components },
    { id: 'websites', key: 'websites', label: 'Websites', count: websites },
  ];
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.findIndex((entry) => entry.id === tab);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    onChoose(tabs[next].id);
    window.requestAnimationFrame(() =>
      document.getElementById(`saved-tab-${tabs[next].key}`)?.focus(),
    );
  };
  return (
    <div className="saved-tabs" role="tablist" aria-label="Saved" onKeyDown={onKeyDown}>
      {tabs.map((entry) => (
        <button
          key={entry.key}
          type="button"
          role="tab"
          id={`saved-tab-${entry.key}`}
          aria-selected={tab === entry.id}
          aria-controls="saved-panel"
          tabIndex={tab === entry.id ? 0 : -1}
          onClick={() => onChoose(entry.id)}
        >
          {entry.label}
          <span className="saved-tab-count">{entry.count.toLocaleString('en-GB')}</span>
        </button>
      ))}
    </div>
  );
}
