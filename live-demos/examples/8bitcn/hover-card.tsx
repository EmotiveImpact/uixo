// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/hover-card.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Button } from "../../vendor/8bitcn/components/ui/8bit/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../vendor/8bitcn/components/ui/8bit/hover-card";

export default function Demo() {
  return (
    <>
      <HoverCard>
        <HoverCardTrigger>
          <Button variant="link">Hover</Button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          For the Horde! ⚔️
        </HoverCardContent>
      </HoverCard>
    </>
  );
}
