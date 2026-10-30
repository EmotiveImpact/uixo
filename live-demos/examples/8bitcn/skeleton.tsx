// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/skeleton.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Skeleton } from '../../vendor/8bitcn/components/ui/8bit/skeleton';

export default function Demo() {
  return (
    <>
      <div className="flex flex-col space-y-5">
        <Skeleton className="h-[125px] w-[250px] rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-[250px]" />
          <Skeleton className="h-5 w-[200px]" />
        </div>
      </div>
    </>
  );
}
