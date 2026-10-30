// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/toggle.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Bold, Italic, Underline } from 'lucide-react';
import { Toggle } from '../../vendor/8bitcn/components/ui/8bit/toggle';

export default function Demo() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <Toggle variant="outline" aria-label="Toggle Bold">
          <Bold className="size-4" />
        </Toggle>
        <Toggle variant="outline" aria-label="Toggle Italic">
          <Italic className="size-4" />
          <span>Italic</span>
        </Toggle>
        <Toggle variant="outline" disabled aria-label="Toggle Disabled">
          <Underline className="size-4" />
          <span>Disabled</span>
        </Toggle>
      </div>
    </>
  );
}
