'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { GraduationCap } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarNav } from './sidebar-nav';

type Ctx = { open: boolean; setOpen: (v: boolean) => void };
const MobileSidebarCtx = createContext<Ctx | null>(null);

export function MobileSidebarProvider({
  children,
  isAdmin,
}: {
  children: ReactNode;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <MobileSidebarCtx.Provider value={{ open, setOpen }}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-12 items-center gap-2 border-b px-3">
            <GraduationCap className="size-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight">ATP</span>
          </div>
          <div className="flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
            <SidebarNav isAdmin={isAdmin} />
          </div>
        </SheetContent>
      </Sheet>
    </MobileSidebarCtx.Provider>
  );
}

export function MobileSidebarTrigger({ children }: { children: ReactNode }) {
  const ctx = useContext(MobileSidebarCtx);
  if (!ctx) return <>{children}</>;
  // Clone the child button and inject an onClick handler that opens the sheet.
  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        ctx.setOpen(true);
      }}
      className="md:hidden"
    >
      {children}
    </span>
  );
}
