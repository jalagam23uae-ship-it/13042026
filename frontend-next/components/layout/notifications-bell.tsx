'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { Bell, Check, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

type Notification = {
  id: number;
  title?: string | null;
  message?: string | null;
  type?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function loadUnreadCount() {
    const client = browserClient();
    const { data } = await client.GET('/notifications/unread-count', {});
    const count = (data as { count?: number } | undefined)?.count ?? 0;
    setUnread(count);
  }

  async function loadList() {
    setLoading(true);
    const client = browserClient();
    const { data } = await client.GET('/notifications/my', {});
    setItems((Array.isArray(data) ? data : []) as Notification[]);
    setLoading(false);
  }

  useEffect(() => {
    loadUnreadCount();
    const t = setInterval(loadUnreadCount, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) loadList();
  }, [open]);

  function markRead(id: number) {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.PUT('/notifications/{notification_id}/read', {
        params: { path: { notification_id: id } },
      });
      if (error) {
        toast.error('Failed to mark as read');
        return;
      }
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    });
  }

  function markAllRead() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.PUT('/notifications/read-all', {});
      if (error) {
        toast.error('Failed to mark all as read');
        return;
      }
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
      toast.success('All notifications marked as read');
    });
  }

  function deleteOne(id: number) {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/notifications/{notification_id}', {
        params: { path: { notification_id: id } },
      });
      if (error) {
        toast.error('Failed to delete notification');
        return;
      }
      setItems((prev) => prev.filter((n) => n.id !== id));
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="sm" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[9px]"
            >
              {unread > 99 ? '99+' : unread}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-2.5">
          <div className="text-sm font-semibold">Notifications</div>
          {items.some((n) => !n.is_read) ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              disabled={isPending}
              className="h-7 text-xs"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul>
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'group flex items-start gap-2 border-b p-3 last:border-b-0',
                    !n.is_read && 'bg-primary/5',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    {n.title ? (
                      <div className="text-sm font-medium truncate">{n.title}</div>
                    ) : null}
                    {n.message ? (
                      <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {n.message}
                      </div>
                    ) : null}
                    {n.created_at ? (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!n.is_read ? (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        disabled={isPending}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Mark as read"
                      >
                        <Check className="size-3" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => deleteOne(n.id)}
                      disabled={isPending}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t p-2 text-center">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
