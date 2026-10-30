// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/popover.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Button } from "../../vendor/8bitcn/components/ui/8bit/button";
import { Input } from "../../vendor/8bitcn/components/ui/8bit/input";
import { Label } from "../../vendor/8bitcn/components/ui/8bit/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../vendor/8bitcn/components/ui/8bit/popover";

export default function Demo() {
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Open popover</Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Dimensions</h4>
              <p className="text-sm text-muted-foreground">
                Set the dimensions for the layer.
              </p>
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="width">Width</Label>
                <Input id="width" defaultValue="100%" className="col-span-2 h-8" />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="height">Height</Label>
                <Input id="height" defaultValue="25px" className="col-span-2 h-8" />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
