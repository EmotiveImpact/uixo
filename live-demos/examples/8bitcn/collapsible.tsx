// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/collapsible.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../vendor/8bitcn/components/ui/8bit/collapsible";

export default function Demo() {
  return (
    <>
      <Collapsible>
        <CollapsibleTrigger>Can I use this in my project?</CollapsibleTrigger>
        <CollapsibleContent>
          Yes. Free to use for personal and commercial projects. No attribution
          required.
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
