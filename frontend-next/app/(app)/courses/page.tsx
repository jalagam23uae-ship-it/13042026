import Link from 'next/link';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, ArrowRight } from 'lucide-react';
import { CreateCourseForm } from '../admin/courses/create-course-form';

export default async function CoursesPage() {
  const user = await requireUser();
  const canCreate = user.role === 'admin';
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/enrollments/my', {});
  const enrollments = (Array.isArray(data) ? data : []) as Array<{
    course_id?: number;
    course_title?: string | null;
    category?: string | null;
    progress_pct?: number | null;
    completed?: boolean | null;
  }>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Courses</h1>
        <p className="text-sm text-muted-foreground">
          Courses you are enrolled in. Click one to see lessons and tests.
        </p>
      </div>

      {canCreate ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Create a course</CardTitle>
                <CardDescription>
                  Admin shortcut — full management (edit, delete, lessons) lives on{' '}
                  <Link href="/admin/courses" className="underline underline-offset-2">
                    Course Management
                  </Link>
                  .
                </CardDescription>
              </div>
              <Link
                href="/admin/courses"
                className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
              >
                Full management
                <ArrowRight />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <CreateCourseForm />
          </CardContent>
        </Card>
      ) : null}

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
                    <CardDescription>{enrollment.category}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent>
                  {id != null ? (
                    <Link
                      href={`/courses/${id}`}
                      className={cn(
                        buttonVariants({ size: 'sm', variant: 'secondary' }),
                        'w-full',
                      )}
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
