import { ToggleGroup } from 'radix-ui';
import { ChevronDown, LayoutGrid, Rows3 } from 'lucide-react';
import { formats } from '../data';
import { ALL_FORMATS, BROWSE_CAPTIONS, BROWSE_TABS } from '../types';
import type { BrowseOrder } from '../types';
import type { Density } from '../hooks/useDensity';

type DiscoveryToolbarProps = {
  browse: BrowseOrder;
  onBrowseChange: (browse: BrowseOrder) => void;
  format: string;
  onFormatChange: (format: string) => void;
  density: Density;
  onDensityChange: (density: Density) => void;
};

export function DiscoveryToolbar({
  browse,
  onBrowseChange,
  format,
  onFormatChange,
  density,
  onDensityChange,
}: DiscoveryToolbarProps) {
  return (
    <div className="discovery-toolbar">
      <div className="browse-group">
        <ToggleGroup.Root
          className="segments browse-tabs"
          type="single"
          value={browse}
          onValueChange={(value) => {
            if (value) onBrowseChange(value as BrowseOrder);
          }}
          aria-label="Browse order"
        >
          {BROWSE_TABS.map((tab) => (
            <ToggleGroup.Item
              value={tab}
              key={tab}
              className={browse === tab ? 'selected' : ''}
              title={BROWSE_CAPTIONS[tab]}
            >
              {tab}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
        {/* The two orderings mean different things, so say which is which. */}
        <p className="browse-caption">{BROWSE_CAPTIONS[browse]}</p>
      </div>

      <div className="toolbar-right">
        <div className="segments density" role="group" aria-label="Grid density">
          <button
            className={density === 'comfortable' ? 'selected' : ''}
            aria-pressed={density === 'comfortable'}
            aria-label="Comfortable grid"
            title="Comfortable"
            onClick={() => onDensityChange('comfortable')}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            className={density === 'compact' ? 'selected' : ''}
            aria-pressed={density === 'compact'}
            aria-label="Compact grid"
            title="Compact"
            onClick={() => onDensityChange('compact')}
          >
            <Rows3 size={15} />
          </button>
        </div>

        <label className="format-filter">
          <span>Format:</span>
          <select
            aria-label="Resource format"
            value={format}
            onChange={(event) => onFormatChange(event.target.value)}
          >
            <option>{ALL_FORMATS}</option>
            {formats.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <ChevronDown size={13} />
        </label>
      </div>
    </div>
  );
}
