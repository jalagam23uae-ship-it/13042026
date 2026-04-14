import { requireUser, getSessionToken, isManager } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SafeMarkdown } from '@/components/common/safe-markdown';
import { asArray } from '@/lib/utils';
import { Megaphone, Pin } from 'lucide-react';
import { CreateAnnouncementDialog } from './_components/create-announcement-dialog';
import { AnnouncementActions } from './_components/announcement-actions';
import { Badge } from '@/components/ui/badge';

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const canCreate = isManager(user);
  const token = await getSessionToken();
  const client = serverClient(token);

  const [annResult, adminCoursesResult] = await Promise.all([
    client.GET('/announcements/', {}),
    canCreate
      ? client.GET('/enrollments/admin/courses', {})
      : Promise.resolve({ data: [] as unknown }),
  ]);
  const announcements = asArray<{
    id: number;
    title: string;
    content: string;
    created_at?: string | null;
    is_pinned?: boolean | null;
  }>(annResult.data);
  announcements.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
  const error = annResult.error;
  const adminCourses = asArray<{ id: number; title: string }>(adminCoursesResult.data);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            Recent news and updates from your instructors and admins.
          </p>
        </div>
        {canCreate ? <CreateAnnouncementDialog courses={adminCourses} /> : null}
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load announcements.
          </CardContent>
        </Card>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No announcements yet.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Megaphone className="size-4 text-muted-foreground" />
                      {announcement.title}
                      {announcement.is_pinned ? (
                        <Badge variant="secondary" className="ml-1 gap-1">
                          <Pin className="size-2.5" />
                          Pinned
                        </Badge>
                      ) : null}
                    </CardTitle>
                    {announcement.created_at ? (
                      <time className="text-xs text-muted-foreground">
                        {new Date(announcement.created_at).toLocaleString()}
                      </time>
                    ) : null}
                  </div>
                  {canCreate ? (
                    <AnnouncementActions
                      id={announcement.id}
                      title={announcement.title}
                      content={announcement.content}
                      pinned={Boolean(announcement.is_pinned)}
                    />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <SafeMarkdown text={announcement.content} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
