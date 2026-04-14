import { requireAdmin, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone } from 'lucide-react';
import { BroadcastForm } from './_components/broadcast-form';

type UserRow = { id: number; name: string; email: string; role: string };

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data } = await client.GET('/users/', {});
  const users = (Array.isArray(data) ? data : []) as UserRow[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Megaphone className="size-5 text-muted-foreground" />
          Broadcast notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Send a notification to one or more users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New broadcast</CardTitle>
          <CardDescription>
            Notifications appear instantly in the recipient&apos;s bell and notifications
            page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BroadcastForm users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
