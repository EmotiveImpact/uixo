// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/slider.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Slider } from "../../vendor/8bitcn/components/ui/8bit/slider";

export default function Demo() {
  return (
    <>
      <div className="flex flex-col gap-5 w-96">
        <Slider defaultValue={[33]} max={100} step={1} />
        <Slider defaultValue={[70]} max={100} step={1} />
      </div>
    </>
  );
}
