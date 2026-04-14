import Link from 'next/link';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, Settings } from 'lucide-react';
import { MyCourseDialog } from '@/components/common/my-courses-dialog';

type Enrollment = {
  course_id?: number;
  course_title?: string | null;
  category?: string | null;
  progress_pct?: number | null;
  completed?: boolean | null;
};

export default async function CoursesPage() {
  const user = await requireUser();
  const role = user.role?.toLowerCase();
  const canManage = role === 'admin' || role === 'instructor';
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/enrollments/my' as never, {} as never);
  const enrollments = (Array.isArray(data) ? data : []) as Enrollment[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Courses</h1>
          <p className="text-sm text-muted-foreground">
            Courses you are enrolled in. Click one to see lessons and tests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Link
              href="/admin/courses"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Settings />
              Manage courses
            </Link>
          )}
          <MyCourseDialog />
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load enrollments.
          </CardContent>
        </Card>
      ) : enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You are not enrolled in any courses yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((enrollment) => {
            const id = enrollment.course_id;
            const title = enrollment.course_title ?? 'Untitled';
            const pct = Math.round(Number(enrollment.progress_pct ?? 0));
            return (
              <Card key={String(id)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <BookOpen className="size-5 text-muted-foreground" />
                    {enrollment.completed ? (
                      <Badge variant="secondary">Completed</Badge>
                    ) : (
                      <Badge>{pct}%</Badge>
                    )}
                  </div>
                  <CardTitle className="mt-2 text-base">{title}</CardTitle>
                  {enrollment.category ? (
                    <p className="text-xs text-muted-foreground">{enrollment.category}</p>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                  {id != null ? (
                    <Link
                      href={`/courses/${id}`}
                      className={cn(buttonVariants({ size: 'sm', variant: 'secondary' }), 'w-full')}
                    >
                      Open course
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
