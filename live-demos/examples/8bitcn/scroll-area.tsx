// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/scroll-area.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { ScrollArea } from "../../vendor/8bitcn/components/ui/8bit/scroll-area";

export default function Demo() {
  return (
    <>
      <ScrollArea className="h-[200px] w-[350px] rounded-md border p-4">
        Jokester began sneaking into the castle in the middle of the night and leaving
        jokes all over the place: under the king&apos;s pillow, in his soup, even in the
        royal toilet. The king was furious, but he couldn&apos;t seem to stop Jokester. And
        then, one day, the people of the kingdom discovered that the jokes left by
        Jokester were so funny that they couldn&apos;t help but laugh. And once they
        started laughing, they couldn&apos;t stop.
      </ScrollArea>
    </>
  );
}
