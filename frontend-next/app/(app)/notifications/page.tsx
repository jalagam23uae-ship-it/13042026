import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';
import { NotificationList } from './_components/notification-list';

type Notification = {
  id: number;
  title: string;
  message?: string | null;
  type?: string | null;
  link?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

export default async function NotificationsPage() {
  await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/notifications/my', {});
  const notifications = (Array.isArray(data) ? data : []) as Notification[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Bell className="size-5 text-muted-foreground" />
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Recent alerts, test results, and updates.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load notifications.
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">You&apos;re all caught up</CardTitle>
          </CardHeader>
          <CardContent className="pb-10 text-center text-sm text-muted-foreground">
            No notifications to show.
          </CardContent>
        </Card>
      ) : (
        <NotificationList initial={notifications} />
      )}
    </div>
  );
}
