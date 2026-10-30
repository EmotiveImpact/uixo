// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/avatar.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../vendor/8bitcn/components/ui/8bit/avatar";

export default function Demo() {
  return (
    <>
      <div className="flex gap-4">
        <Avatar variant="pixel">
          <AvatarImage
            src="/images/pixelized-8bitcnorc.jpg"
            alt="@8bitcn"
          />
          <AvatarFallback>8B</AvatarFallback>
        </Avatar>
        <Avatar variant="default">
          <AvatarImage
            src="/images/pixelized-8bitcnorc.jpg"
            alt="@8bitcn"
          />
          <AvatarFallback>8B</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>8B</AvatarFallback>
        </Avatar>
      </div>
    </>
  );
}
