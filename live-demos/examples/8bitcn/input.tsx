// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/input.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Input } from '../../vendor/8bitcn/components/ui/8bit/input';

export default function Demo() {
  return (
    <>
      <Input placeholder="Enter text" className="max-w-md" />
    </>
  );
}
