// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/progress.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Progress } from '../../vendor/8bitcn/components/ui/8bit/progress';

export default function Demo() {
  return (
    <>
      <div className="flex flex-col gap-5 w-96">
        <Progress value={70} />
        <Progress value={70} variant="retro" />
      </div>
    </>
  );
}
