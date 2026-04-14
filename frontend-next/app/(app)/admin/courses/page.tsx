import { requireManager, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BookOpen, Users, Tag, CheckCircle2, XCircle, BookMarked } from 'lucide-react';
import { CreateCourseDialog } from '@/components/admin/courses/create-course-dialog';
import { CoursesSearchTable } from '@/components/admin/courses/courses-search-table';
import { PendingApprovalsSection } from '@/components/admin/courses/pending-approvals-section';

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

export default async function AdminCoursesPage() {
  const user = await requireManager();
  const isAdmin = user.role?.toLowerCase() === 'admin';
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/enrollments/admin/courses' as never, {} as never);
  const courses = (Array.isArray(data) ? data : []) as AdminCourse[];

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
        <CreateCourseDialog isInstructor={!isAdmin} />
      </div>

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

      {isAdmin && <PendingApprovalsSection />}

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
