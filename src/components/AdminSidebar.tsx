import { navigateInApp } from '../lib/navigation';
import { useState } from 'react';
import {
  ArrowLeft,
  Database,
  FileCheck2,
  Gauge,
  Inbox,
  PanelLeft,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  AnimatedSidebar,
  AnimatedSidebarClose,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarHeader,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarRail,
  AnimatedSidebarTrigger,
} from './motion/animated-sidebar';

type AdminSection = 'overview' | 'submissions' | 'reports' | 'registry';

type AdminSidebarProps = {
  onExit: () => void;
  onWebsiteReview: () => void;
  onAssetReview: () => void;
  onScout: () => void;
  onJobs: () => void;
};

const SECTION_IDS: Record<AdminSection, string> = {
  overview: 'admin-overview',
  submissions: 'admin-submissions-panel',
  reports: 'admin-reports-panel',
  registry: 'admin-registry-panel',
};

export function AdminSidebar({
  onExit,
  onWebsiteReview,
  onAssetReview,
  onScout,
  onJobs,
}: AdminSidebarProps) {
  const [section, setSection] = useState<AdminSection>('overview');

  const showSection = (next: AdminSection) => {
    setSection(next);
    document
      .getElementById(SECTION_IDS[next])
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AnimatedSidebar ariaLabel="UIXO admin navigation" collapsible="icon">
      <AnimatedSidebarHeader className="p-3 pb-2">
        <div className="flex min-h-11 items-center gap-3 overflow-hidden px-2">
          <button className="brand admin-brand" onClick={onExit} aria-label="Exit admin mode">
            <span className="group-data-[state=collapsed]/sidebar:hidden">UIXO</span>
            <span className="hidden group-data-[state=collapsed]/sidebar:block">U</span>
          </button>
          <span className="admin-brand-mode group-data-[state=collapsed]/sidebar:hidden">
            Admin
          </span>
          <AnimatedSidebarTrigger
            className="sidebar-header-toggle ml-auto hidden md:grid"
            aria-label="Toggle admin navigation"
          >
            <PanelLeft className="size-4" />
          </AnimatedSidebarTrigger>
          <AnimatedSidebarClose className="ml-auto md:hidden">
            <X className="size-4" />
          </AnimatedSidebarClose>
        </div>
      </AnimatedSidebarHeader>

      <AnimatedSidebarContent className="px-2 pt-1">
        <AnimatedSidebarGroup className="pb-4 pt-5">
          <AnimatedSidebarGroupLabel>Workspace</AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<Gauge className="size-4" />}
                  isActive={section === 'overview'}
                  onSelect={() => showSection('overview')}
                >
                  Overview
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>

        <AnimatedSidebarGroup className="pt-3">
          <AnimatedSidebarGroupLabel>Moderation</AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<Inbox className="size-4" />}
                  isActive={section === 'submissions'}
                  onSelect={() => showSection('submissions')}
                >
                  Submissions
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<ShieldAlert className="size-4" />}
                  isActive={section === 'reports'}
                  onSelect={() => showSection('reports')}
                >
                  Reports
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<FileCheck2 className="size-4" />}
                  onSelect={onWebsiteReview}
                >
                  Website candidates
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<ShieldCheck className="size-4" />}
                  onSelect={onAssetReview}
                >
                  Asset revisions
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>

        <AnimatedSidebarGroup className="pt-3">
          <AnimatedSidebarGroupLabel>Registry</AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<Database className="size-4" />}
                  isActive={section === 'registry'}
                  onSelect={() => navigateInApp('/browse/assets?view=health')}
                >
                  Registry health
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton icon={<Radar className="size-4" />} onSelect={onScout}>
                  Scout intake
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<FileCheck2 className="size-4" />}
                  onSelect={() => navigateInApp('/browse/assets?view=collection-editor')}
                >
                  Asset collections
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<Radar className="size-4" />}
                  onSelect={() => navigateInApp('/browse/assets?view=operations')}
                >
                  Operations board
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
              <AnimatedSidebarMenuItem>
                <AnimatedSidebarMenuButton
                  icon={<RefreshCw className="size-4" />}
                  onSelect={onJobs}
                >
                  Indexing runs
                </AnimatedSidebarMenuButton>
              </AnimatedSidebarMenuItem>
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>
      </AnimatedSidebarContent>

      <AnimatedSidebarFooter className="border-none p-3">
        <AnimatedSidebarMenu>
          <AnimatedSidebarMenuItem>
            <AnimatedSidebarMenuButton icon={<ArrowLeft className="size-4" />} onSelect={onExit}>
              Exit admin
            </AnimatedSidebarMenuButton>
          </AnimatedSidebarMenuItem>
        </AnimatedSidebarMenu>
        <p className="sidebar-note group-data-[state=collapsed]/sidebar:hidden">
          Admin mode
          <br />
          Changes affect the live catalogue.
        </p>
      </AnimatedSidebarFooter>
      <AnimatedSidebarRail />
    </AnimatedSidebar>
  );
}
