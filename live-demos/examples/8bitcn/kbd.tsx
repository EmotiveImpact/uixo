// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/kbd.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Button } from "../../vendor/8bitcn/components/ui/8bit/button";
import { Kbd, KbdGroup } from "../../vendor/8bitcn/components/ui/8bit/kbd";

export default function Demo() {
  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <KbdGroup>
          <Kbd>↑</Kbd>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <Kbd>↓</Kbd>
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
        </KbdGroup>
        <KbdGroup>
          <Kbd>IDDQD</Kbd>
        </KbdGroup>
      </div>
    </>
  );
}
