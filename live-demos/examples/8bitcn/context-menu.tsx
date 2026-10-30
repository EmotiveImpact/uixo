// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/context-menu.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Button } from '../../vendor/8bitcn/components/ui/8bit/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../vendor/8bitcn/components/ui/8bit/context-menu';

export default function Demo() {
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <Button>Right click me</Button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Profile</ContextMenuItem>
          <ContextMenuItem>Billing</ContextMenuItem>
          <ContextMenuItem>Team</ContextMenuItem>
          <ContextMenuItem>Subscription</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}
