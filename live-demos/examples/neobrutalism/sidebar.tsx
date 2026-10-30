// The docs page leads with a full-page layout whose sidebar turns into a phone sheet below
// 768px, so a 480px card would only show the closed mobile state. This renders the same
// original AppSidebar demo with the component's own collapsible="none" option, which draws
// the sidebar in place at any width. Neither file is changed.
import { SidebarProvider } from '../../vendor/neobrutalism/components/ui/sidebar';
import { AppSidebar } from '../../vendor/neobrutalism/examples/ui/sidebar/sidebar';

export default function SidebarCardDemo() {
  return (
    <SidebarProvider className="h-[320px] min-h-0 w-auto">
      <AppSidebar
        collapsible="none"
        className="rounded-base border-2 border-border shadow-shadow"
      />
    </SidebarProvider>
  );
}
