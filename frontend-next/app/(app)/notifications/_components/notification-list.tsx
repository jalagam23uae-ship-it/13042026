'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Notification = {
  id: number;
  title: string;
  message?: string | null;
  type?: string | null;
  link?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

export function NotificationList({ initial }: { initial: Notification[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>(initial);
  const [pending, startTransition] = useTransition();

  const unreadCount = items.filter((n) => !n.is_read).length;

  function markOne(id: number) {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.PUT('/notifications/{notification_id}/read', {
        params: { path: { notification_id: id } },
      });
      if (error) {
        toast.error('Failed to mark as read.');
        return;
      }
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    });
  }

  function markAll() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.PUT('/notifications/read-all', {});
      if (error) {
        toast.error('Failed to mark all as read.');
        return;
      }
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/notifications/{notification_id}', {
        params: { path: { notification_id: id } },
      });
      if (error) {
        toast.error('Failed to delete notification.');
        return;
      }
      setItems((prev) => prev.filter((n) => n.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || unreadCount === 0}
          onClick={markAll}
        >
          {pending ? <Loader2 className="animate-spin" /> : <CheckCheck />}
          Mark all as read
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((n) => (
          <Card
            key={n.id}
            className={cn('transition-colors', !n.is_read && 'border-primary/40 bg-primary/[0.02]')}
          >
            <CardContent className="flex items-start gap-3 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{n.title}</span>
                  {n.type ? (
                    <Badge variant="secondary" className="capitalize">
                      {n.type}
                    </Badge>
                  ) : null}
                  {!n.is_read ? <span className="size-1.5 rounded-full bg-primary" /> : null}
                </div>
                {n.message ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                ) : null}
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  {n.created_at ? <time>{new Date(n.created_at).toLocaleString()}</time> : null}
                  {n.link ? (
                    <Link href={n.link} className="underline-offset-2 hover:underline">
                      Open
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {!n.is_read ? (
                  <Button size="icon" variant="ghost" onClick={() => markOne(n.id)}>
                    <Check className="size-4" />
                  </Button>
                ) : null}
                <Button size="icon" variant="ghost" onClick={() => remove(n.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
