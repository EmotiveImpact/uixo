// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/separator.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Separator } from "../../vendor/8bitcn/components/ui/8bit/separator";

export default function Demo() {
  return (
    <>
      <div>
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">8bit-separator</h4>
          <p className="text-sm text-muted-foreground">
            An open-source UI component library.
          </p>
        </div>
        <Separator className="my-4" />
        <div className="flex h-5 items-center space-x-4 text-sm">
          <div>Blog</div>
          <Separator orientation="vertical" />
          <div>Docs</div>
          <Separator orientation="vertical" />
          <div>Source</div>
        </div>
      </div>
    </>
  );
}
