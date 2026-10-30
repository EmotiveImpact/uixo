// The demo 8bitcn's docs page leads with (content/docs/components/toast.mdx renders
// <ToastExample />). On the site the Toaster sits in app/layout.tsx; the frame has no layout,
// so this file mounts the provider's own Toaster next to the unchanged example.
import { ToastExample } from '../../vendor/8bitcn/components/examples/toast';
import { Toaster } from '../../vendor/8bitcn/components/ui/sonner';

export default function Demo() {
  return (
    <>
      <ToastExample />
      <Toaster />
    </>
  );
}
