// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/empty.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Button } from '../../vendor/8bitcn/components/ui/8bit/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../../vendor/8bitcn/components/ui/8bit/empty';

export default function Demo() {
  return (
    <>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No Characters Yet</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t created any Characters yet. Get started by creating your first
            character.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap justify-center gap-6">
            <Button>Create Character</Button>
            <Button variant="outline">Import Character</Button>
          </div>
        </EmptyContent>
      </Empty>
    </>
  );
}
