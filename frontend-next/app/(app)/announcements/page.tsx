import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SafeMarkdown } from '@/components/safe-markdown';
import { Megaphone, Pin } from 'lucide-react';
import { CreateAnnouncementForm } from './create-announcement-form';
import { AnnouncementActions } from './announcement-actions';
import { Badge } from '@/components/ui/badge';

export default async function AnnouncementsPage() {
  const user = await requireUser();
  const canCreate = user.role === 'admin' || user.role === 'instructor';
  const token = await getSessionToken();
  const client = serverClient(token);

  const [annResult, adminCoursesResult] = await Promise.all([
    client.GET('/announcements/', {}),
    canCreate
      ? client.GET('/enrollments/admin/courses', {})
      : Promise.resolve({ data: [] as unknown }),
  ]);
  const announcements = (Array.isArray(annResult.data) ? annResult.data : []) as Array<{
    id: number;
    title: string;
    content: string;
    created_at?: string | null;
    is_pinned?: boolean | null;
  }>;
  announcements.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
  const error = annResult.error;
  const adminCourses = (
    Array.isArray(adminCoursesResult.data) ? adminCoursesResult.data : []
  ) as Array<{ id: number; title: string }>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">
          Recent news and updates from your instructors and admins.
        </p>
      </div>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Post new announcement</CardTitle>
            <CardDescription>Admin / instructor only.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateAnnouncementForm courses={adminCourses} />
          </CardContent>
        </Card>
      ) : null}

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
