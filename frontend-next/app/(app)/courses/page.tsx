import Link from 'next/link';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, Users, Tag, CheckCircle2, XCircle, BookMarked } from 'lucide-react';
import { CreateCourseDialog } from '../admin/courses/create-course-dialog';
import { CoursesSearchTable } from '../admin/courses/courses-search-table';
import { PendingApprovalsSection } from '../admin/courses/pending-approvals-section';
import { MyCourseDialog } from './my-courses-dialog';

type AdminCourse = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  lesson_count?: number | null;
  enrollment_count?: number | null;
  is_active?: boolean | null;
  approval_status?: string | null;
};

type Enrollment = {
  course_id?: number;
  course_title?: string | null;
  category?: string | null;
  progress_pct?: number | null;
  completed?: boolean | null;
};

export default async function CoursesPage() {
  const user = await requireUser();
  const canManage =
    user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'instructor';
  const isAdmin = user.role?.toLowerCase() === 'admin';
  const token = await getSessionToken();
  const client = serverClient(token);

  /* ── Admin / Instructor: management view ─────────────────── */
  if (canManage) {
    const { data, error } = await client.GET('/enrollments/admin/courses' as never, {} as never);
    const courses = (Array.isArray(data) ? data : []) as AdminCourse[];

    // Compute stats from the courses array
    const totalCourses = courses.length;
    const totalEnrolled = courses.reduce((sum, c) => sum + (c.enrollment_count ?? 0), 0);
    const categoryCount = new Set(courses.filter((c) => c.category).map((c) => c.category)).size;
    const activeCount = courses.filter((c) => c.is_active !== false).length;
    const inactiveCount = courses.filter((c) => c.is_active === false).length;

    const statCards = [
      {
        label: 'Total Courses',
        value: totalCourses,
        sub: `${categoryCount} ${categoryCount === 1 ? 'category' : 'categories'}`,
        icon: BookMarked,
        iconBg: 'bg-violet-100',
        iconColor: 'text-violet-600',
      },
      {
        label: 'Total Enrolled',
        value: totalEnrolled,
        sub: 'student enrollments',
        icon: Users,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        label: 'Categories',
        value: categoryCount,
        sub: 'unique categories',
        icon: Tag,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
      },
      {
        label: 'Active',
        value: activeCount,
        sub: 'published courses',
        icon: CheckCircle2,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      },
      {
        label: 'Inactive',
        value: inactiveCount,
        sub: 'unpublished courses',
        icon: XCircle,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-500',
      },
    ];

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
            <p className="text-sm text-muted-foreground">
              Create, edit, and manage all courses on the platform.
            </p>
          </div>
          {canManage && <CreateCourseDialog isInstructor={!isAdmin} />}
        </div>

        {/* Stats strip */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map(({ label, value, sub, icon: Icon, iconBg, iconColor }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className={cn('flex size-9 items-center justify-center rounded-xl', iconBg)}>
                    <Icon className={cn('size-4', iconColor)} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold">{value}</div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-0.5">
                    {label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending approvals — admin only */}
        {isAdmin && <PendingApprovalsSection />}

        {/* Courses table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4 text-muted-foreground" />
              All courses ({totalCourses})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-destructive">Failed to load courses.</p>
            ) : (
              <CoursesSearchTable courses={courses} />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Student: enrolled courses view ──────────────────────── */
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
        <MyCourseDialog />
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
