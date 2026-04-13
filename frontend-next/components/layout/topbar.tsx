import { LogOut, Menu } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logoutAction } from '@/app/actions/auth';
import type { SessionUser } from '@/lib/auth/session';
import { NotificationsBell } from './notifications-bell';
import { ThemeToggle } from './theme-toggle';
import { MobileSidebarTrigger } from './mobile-sidebar';

export function Topbar({ user }: { user: SessionUser }) {
  const initials = (user.name ?? user.email ?? '?')
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarUrl = (user as { avatar_url?: string | null }).avatar_url ?? null;

  return (
    <header className="flex h-12 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <MobileSidebarTrigger>
          <Button variant="ghost" size="sm" className="md:hidden" aria-label="Open menu">
            <Menu className="size-4" />
          </Button>
        </MobileSidebarTrigger>
        <div className="text-[13px] font-medium text-muted-foreground">
          Automate Training Platform
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <NotificationsBell />
        <Badge variant="secondary" className="capitalize text-[10px]">
          {user.role}
        </Badge>
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={user.name} /> : null}
            <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden text-[12px] sm:block">
            <div className="font-medium leading-tight">{user.name}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{user.email}</div>
          </div>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut className="size-3.5" />
            <span className="sr-only sm:not-sr-only">Log out</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
