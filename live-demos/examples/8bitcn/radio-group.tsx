// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/radio-group.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Label } from '../../vendor/8bitcn/components/ui/8bit/label';
import { RadioGroup, RadioGroupItem } from '../../vendor/8bitcn/components/ui/8bit/radio-group';

export default function Demo() {
  return (
    <>
      <RadioGroup defaultValue="comfortable">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="default" id="r1" />
          <Label htmlFor="r1">Default</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="comfortable" id="r2" />
          <Label htmlFor="r2">Comfortable</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="compact" id="r3" />
          <Label htmlFor="r3">Compact</Label>
        </div>
      </RadioGroup>
    </>
  );
}
