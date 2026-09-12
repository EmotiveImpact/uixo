import { CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from './shadcn/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './shadcn/card';
import { Input } from './shadcn/input';
import { Skeleton } from './shadcn/skeleton';
import { Spinner } from './shadcn/spinner';

const previews: Record<string, () => ReactNode> = {
  alert: () => (
    <div className="asset-preview-source">
      <Alert>
        <CircleCheck aria-hidden="true" />
        <AlertTitle>Changes saved</AlertTitle>
        <AlertDescription>Your project is ready to continue.</AlertDescription>
      </Alert>
    </div>
  ),
  card: () => (
    <div className="asset-preview-source">
      <Card>
        <CardHeader>
          <CardTitle>Design system</CardTitle>
          <CardDescription>A reusable foundation for your next interface.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">12 components ready</CardContent>
        <CardFooter className="text-xs text-muted-foreground">Updated today</CardFooter>
      </Card>
    </div>
  ),
  input: () => (
    <div className="asset-preview-source">
      <label className="grid gap-2 text-sm font-medium">
        Project name
        <Input tabIndex={-1} readOnly value="UIXO library" aria-label="Project name preview" />
      </label>
    </div>
  ),
  skeleton: () => (
    <div className="asset-preview-source is-skeleton" aria-label="Loading content preview">
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </div>
  ),
  spinner: () => (
    <div className="asset-preview-source is-spinner">
      <Spinner />
    </div>
  ),
};

export function PinnedComponentPreview({ providerId, slug }: { providerId: string; slug: string }) {
  if (providerId !== 'shadcn') return null;
  const render = previews[slug];
  return render ? render() : null;
}
