import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-muted/30 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
