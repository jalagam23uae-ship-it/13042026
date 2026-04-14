import Link from 'next/link';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  Megaphone,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import { AdminDashboard } from '@/components/dashboards/admin-dashboard';
import { InstructorDashboard } from '@/components/dashboards/instructor-dashboard';
import { MyCourseDialog } from '@/components/common/my-courses-dialog';

type Enrollment = {
  course_id?: number;
  course_title?: string | null;
  progress_pct?: number | null;
  completed?: boolean | null;
  total_lessons?: number | null;
  completed_lessons?: number | null;
};

type TestResult = {
  id: number;
  test_id: number;
  score?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  taken_at?: string | null;
};

type Announcement = {
  id: number;
  title: string;
  message: string;
  created_at?: string | null;
};

type EligibleCert = {
  course_id: number;
  course_title: string;
  eligible?: boolean | null;
  issued?: boolean | null;
};

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role?.toLowerCase() === 'admin') {
    return <AdminDashboard name={user.name} email={user.email} role={user.role} />;
  }
  if (user.role?.toLowerCase() === 'instructor') {
    return (
      <InstructorDashboard
        id={user.id}
        name={user.name}
        email={user.email}
        role={user.role}
      />
    );
  }

  const token = await getSessionToken();
  const client = serverClient(token);

  const [enrollmentsResult, resultsResult, certsResult, annResult] = await Promise.all([
    client.GET('/enrollments/my', {}),
    client.GET('/results/me', {}),
    client.GET('/certificates/eligible', {}),
    client.GET('/announcements/', {}),
  ]);

  const enrollments = (Array.isArray(enrollmentsResult.data) ? enrollmentsResult.data : []) as Enrollment[];
  const results = (Array.isArray(resultsResult.data) ? resultsResult.data : []) as TestResult[];
  const certs = (Array.isArray(certsResult.data) ? certsResult.data : []) as EligibleCert[];
  const announcements = (Array.isArray(annResult.data) ? annResult.data : []) as Announcement[];

  const activeCourses = enrollments.filter((e) => !e.completed).length;
  const completedCourses = enrollments.filter((e) => e.completed).length;
  const totalLessons = enrollments.reduce((n, e) => n + Number(e.total_lessons ?? 0), 0);
  const lessonsDone = enrollments.reduce((n, e) => n + Number(e.completed_lessons ?? 0), 0);
  const testsPassed = results.filter((r) => r.passed).length;
  const certsIssued = certs.filter((c) => c.issued).length;
  const certsEligible = certs.filter((c) => c.eligible && !c.issued).length;
  const recentAnnouncements = [...announcements]
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 3);

  const inProgressCourses = enrollments
    .filter((e) => !e.completed && e.course_id != null)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Welcome back, {user.name.split(/\s+/)[0] ?? user.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{user.email}</span>
          <Badge variant="secondary" className="ml-2 capitalize">
            {user.role}
          </Badge>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard
          icon={BookOpen}
          title="Active courses"
          value={String(activeCourses)}
          hint={completedCourses ? `${completedCourses} completed` : 'Keep learning'}
          href="/courses"
        />
        <DashCard
          icon={Trophy}
          title="Lessons complete"
          value={`${lessonsDone}${totalLessons ? ` / ${totalLessons}` : ''}`}
          hint={totalLessons ? `${Math.round((lessonsDone / totalLessons) * 100)}% overall` : 'Start a lesson'}
          href="/progress"
        />
        <DashCard
          icon={ClipboardList}
          title="Tests passed"
          value={`${testsPassed}${results.length ? ` / ${results.length}` : ''}`}
          hint={results.length ? 'Attempts recorded' : 'Take a test'}
          href="/tests"
        />
        <DashCard
          icon={GraduationCap}
          title="Certificates"
          value={String(certsIssued)}
          hint={certsEligible ? `${certsEligible} eligible to claim` : 'Complete a course'}
          href="/certificates"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="size-4 text-muted-foreground" />
                In progress
              </CardTitle>
              <MyCourseDialog />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {inProgressCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No courses in progress. Browse the{' '}
                <Link href="/enrollments" className="underline underline-offset-2">
                  catalog
                </Link>{' '}
                to start one.
              </p>
            ) : (
              inProgressCourses.map((enrollment) => {
                const pct = Math.round(Number(enrollment.progress_pct ?? 0));
                return (
                  <Link
                    key={enrollment.course_id}
                    href={`/courses/${enrollment.course_id}`}
                    className="flex flex-col gap-1 rounded-md border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">
                        {enrollment.course_title ?? 'Untitled'}
                      </span>
                      <Badge variant="secondary">{pct}%</Badge>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="size-4 text-muted-foreground" />
                Latest announcements
              </CardTitle>
              <Link
                href="/announcements"
                className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }))}
              >
                All <ArrowRight />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recentAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              recentAnnouncements.map((ann) => (
                <div key={ann.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{ann.title}</div>
                  {ann.created_at ? (
                    <div className="text-xs text-muted-foreground">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </div>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {ann.message}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashCard({
  icon: Icon,
  title,
  value,
  hint,
  href,
}: {
  icon: typeof BookOpen;
  title: string;
  value: string;
  hint: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border bg-card transition-colors hover:bg-accent"
    >
      <div className="flex items-center justify-between p-4 pb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="p-4 pt-1">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </Link>
  );
}
