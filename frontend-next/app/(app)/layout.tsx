import type { ReactNode } from 'react';
import { GraduationCap } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Topbar } from '@/components/layout/topbar';
import { MobileSidebarProvider } from '@/components/layout/mobile-sidebar';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';

  return (
    <MobileSidebarProvider isAdmin={isAdmin}>
      <div className="flex min-h-screen bg-muted/30">
        <aside className="hidden w-56 shrink-0 flex-col border-r bg-sidebar md:flex">
          <div className="flex h-12 items-center gap-2 border-b px-3">
            <GraduationCap className="size-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight">ATP</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav isAdmin={isAdmin} />
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <Topbar user={user} />
          <main className="flex-1 overflow-y-auto p-4 md:p-5">{children}</main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}
