// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/card.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import { Button } from '../../vendor/8bitcn/components/ui/8bit/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../vendor/8bitcn/components/ui/8bit/card';
import { Input } from '../../vendor/8bitcn/components/ui/8bit/input';
import { Label } from '../../vendor/8bitcn/components/ui/8bit/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../vendor/8bitcn/components/ui/8bit/select';

export default function Demo() {
  return (
    <>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription className="text-xs">
            Deploy your new project in one-click.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Label>Name</Label>
          <Input placeholder="Project name" className="max-w-72" />
          <Label>Framework</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Framework" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="next">Next.js</SelectItem>
              <SelectItem value="svelte">SvelteKit</SelectItem>
              <SelectItem value="astro">Astro</SelectItem>
              <SelectItem value="nuxt">Nuxt.js</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button>Create</Button>
        </CardFooter>
      </Card>
    </>
  );
}
