// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/button-group.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Button } from "../../vendor/8bitcn/components/ui/8bit/button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "../../vendor/8bitcn/components/ui/8bit/button-group";

export default function Demo() {
  return (
    <>
      <ButtonGroup aria-label="Action group">
        <Button>Left</Button>
        <ButtonGroupSeparator />
        <Button>Center</Button>
        <ButtonGroupSeparator />
        <Button>Right</Button>
      </ButtonGroup>
    </>
  );
}
