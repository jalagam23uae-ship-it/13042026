import type { ReactNode } from 'react';
import { GraduationCap } from 'lucide-react';
import { requireUser, isAdmin as checkIsAdmin } from '@/lib/auth/session';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Topbar } from '@/components/layout/topbar';
import { MobileSidebarProvider } from '@/components/layout/mobile-sidebar';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const isAdmin = checkIsAdmin(user);

  return (
    <MobileSidebarProvider isAdmin={isAdmin}>
      <div className="flex min-h-screen bg-muted/30">
        {/* ── Desktop sidebar ──────────────────────────────── */}
        <aside
          className="hidden w-56 shrink-0 flex-col md:flex"
          style={{
            backgroundColor: 'oklch(0.255 0.040 258)',
            borderRight: '1px solid oklch(1 0 0 / 10%)',
          }}
        >
          {/* Logo strip */}
          <div
            className="flex h-12 items-center gap-2 px-3 shrink-0"
            style={{ borderBottom: '1px solid oklch(1 0 0 / 10%)' }}
          >
            <GraduationCap className="size-5 shrink-0" style={{ color: 'oklch(0.620 0.210 272)' }} />
            <span
              className="text-sm font-bold tracking-tight"
              style={{ color: 'oklch(0.970 0.005 258)' }}
            >
              ATP
            </span>
          </div>
          {/* Nav */}
          <div className="flex-1 overflow-y-auto">
            <SidebarNav isAdmin={isAdmin} />
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0">
          <Topbar user={user} />
          <main className="flex-1 overflow-y-auto p-4 md:p-5">{children}</main>
        </div>
      </div>
    </MobileSidebarProvider>
  );
}
