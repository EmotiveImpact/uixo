// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/checkbox.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Checkbox } from '../../vendor/8bitcn/components/ui/8bit/checkbox';
import { Label } from '../../vendor/8bitcn/components/ui/8bit/label';

export default function Demo() {
  return (
    <>
      <div className="flex items-center gap-4">
        <Checkbox id="terms" />
        <Label htmlFor="terms" className="text-xs">
          Accept terms and conditions
        </Label>
      </div>
    </>
  );
}
