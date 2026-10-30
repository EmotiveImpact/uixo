// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/spinner.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Spinner } from "../../vendor/8bitcn/components/ui/8bit/spinner";
import { Button } from "../../vendor/8bitcn/components/ui/8bit/button";
import { Badge } from "../../vendor/8bitcn/components/ui/8bit/badge";

export default function Demo() {
  return (
    <>
      <div className="flex gap-8 items-center">
        <div className="flex flex-col items-center">
          <Spinner />
          <p className="text-sm text-muted-foreground">Classic</p>
        </div>
        <div className="flex flex-col items-center mt-1">
          <Spinner variant="diamond" />
          <p className="text-sm text-muted-foreground">Diamond</p>
        </div>
      </div>
    </>
  );
}
