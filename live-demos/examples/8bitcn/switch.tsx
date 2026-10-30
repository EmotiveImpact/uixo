// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/switch.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Label } from '../../vendor/8bitcn/components/ui/8bit/label';
import { Switch } from '../../vendor/8bitcn/components/ui/8bit/switch';

export default function Demo() {
  return (
    <>
      <div className="flex items-center space-x-3">
        <Switch id="airplane-mode" />
        <Label htmlFor="airplane-mode">Airplane Mode</Label>
      </div>
    </>
  );
}
