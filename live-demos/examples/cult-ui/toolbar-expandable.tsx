// cult-ui's docs demo is a long page whose first toolbar sits below a card's fold. This
// renders the unchanged ToolbarExpandable with the demo's own two-step "Download
// Configuration" steps, copied from the pinned demo (registry/default/example/
// toolbar-expandable-demo.tsx).
import { Download, Settings } from 'lucide-react';

import { Button } from '../../vendor/cult-ui/components/ui/button';
import ToolbarExpandable from '../../vendor/cult-ui/registry/default/ui/toolbar-expandable';

const downloadSteps = [
  {
    id: 'format',
    title: 'Choose Format',
    description: 'Select the download format that best suits your needs.',
    icon: Download,
    content: (
      <div className="space-y-4">
        <div className="grid gap-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50">
            <input type="radio" name="format" value="zip" defaultChecked />
            <div>
              <div className="font-medium">ZIP Archive</div>
              <div className="text-sm text-gray-600">Complete project as compressed file</div>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50">
            <input type="radio" name="format" value="git" />
            <div>
              <div className="font-medium">Git Repository</div>
              <div className="text-sm text-gray-600">Clone-ready repository with history</div>
            </div>
          </label>
        </div>
      </div>
    ),
  },
  {
    id: 'options',
    title: 'Download Options',
    description: 'Configure additional options for your download.',
    icon: Settings,
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Include dependencies</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Include documentation</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm">Include example files</span>
          </label>
        </div>
        <Button variant="outline" className="w-full bg-transparent">
          <Settings className="mr-2 h-4 w-4" />
          Configure Options
        </Button>
      </div>
    ),
  },
];

export function ToolbarExpandableExample() {
  return (
    <div className="w-[420px] max-w-full">
      <ToolbarExpandable steps={downloadSteps} badgeText="DOWNLOAD" />
    </div>
  );
}
