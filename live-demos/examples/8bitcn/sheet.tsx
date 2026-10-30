// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/sheet.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Button } from '../../vendor/8bitcn/components/ui/8bit/button';
import { Input } from '../../vendor/8bitcn/components/ui/8bit/input';
import { Label } from '../../vendor/8bitcn/components/ui/8bit/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../vendor/8bitcn/components/ui/8bit/sheet';

export default function Demo() {
  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription className="text-xs">
              Make changes to your profile here. Click save when you&apos;re done.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 flex flex-col gap-4">
            <Label>Name</Label>
            <Input placeholder="Project name" />
          </div>
          <SheetFooter className="flex-row-reverse">
            <SheetClose asChild>
              <Button size="sm">Save changes</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
