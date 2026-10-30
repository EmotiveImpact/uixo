// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/dialog.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Button } from "../../vendor/8bitcn/components/ui/8bit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../vendor/8bitcn/components/ui/8bit/dialog";
import { Input } from "../../vendor/8bitcn/components/ui/8bit/input";
import { Label } from "../../vendor/8bitcn/components/ui/8bit/label";

export default function Demo() {
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription className="text-xs">
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DialogDescription>
          </DialogHeader>
          <Label>Name</Label>
          <Input placeholder="Project name" />
          <DialogFooter>
            <Button size="sm">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
