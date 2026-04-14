import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Clock, Timer, BookOpen, Activity } from 'lucide-react';

type UserDetail = {
  id: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type TimeDetail = {
  user_id: number;
  login_sessions?: Array<{
    start?: string | null;
    end?: string | null;
    duration_minutes?: number | null;
  }> | null;
  course_views?: Array<{
    course_id: number;
    course_title?: string | null;
    duration_minutes?: number | null;
    last_viewed?: string | null;
  }> | null;
  total_login_minutes?: number | null;
  total_course_minutes?: number | null;
};

type EnrollmentRow = {
  course_id?: number;
  course_title?: string | null;
  progress_pct?: number | null;
  completed?: boolean | null;
  enrolled_at?: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId: userIdStr } = await params;
  const userId = Number(userIdStr);
  if (!Number.isFinite(userId)) notFound();

  const token = await getSessionToken();
  const client = serverClient(token);

  const [userRes, timeRes, enrollRes] = await Promise.all([
    client.GET('/users/{user_id}' as never, {
      params: { path: { user_id: userId } },
    } as never),
    client.GET('/time-tracking/admin/user/{user_id}' as never, {
      params: { path: { user_id: userId } },
    } as never),
    client.GET('/enrollments/all' as never, {} as never),
  ]);

  const user = userRes.data as UserDetail | undefined;
  const time = (timeRes.data ?? {}) as TimeDetail;
  const allEnrollments = (Array.isArray(enrollRes.data) ? enrollRes.data : []) as Array<
    EnrollmentRow & { user_id?: number }
  >;
  const enrollments = allEnrollments.filter((e) => e.user_id === userId);

  if (!user) notFound();

  const totalLoginH = ((time.total_login_minutes ?? 0) / 60).toFixed(1);
  const totalCourseH = ((time.total_course_minutes ?? 0) / 60).toFixed(1);
  const loginSessions = time.login_sessions ?? [];
  const courseViews = time.course_views ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/student-tracking"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name ?? `User ${user.id}`}</h1>
          <p className="text-sm text-muted-foreground">
            {user.email} ·{' '}
            <Badge variant="secondary" className="capitalize">
              {user.role ?? '—'}
            </Badge>
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Clock} label="Login hours" value={`${totalLoginH}h`} />
        <Stat icon={Timer} label="Course hours" value={`${totalCourseH}h`} />
        <Stat icon={BookOpen} label="Enrolled" value={String(enrollments.length)} />
        <Stat
          icon={Activity}
          label="Completed"
          value={String(enrollments.filter((e) => e.completed).length)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enrolled courses</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((e) => (
                  <TableRow key={`${e.course_id}`}>
                    <TableCell className="font-medium">
                      {e.course_title ?? `Course ${e.course_id}`}
                    </TableCell>
                    <TableCell>{Math.round(Number(e.progress_pct ?? 0))}%</TableCell>
                    <TableCell className="text-xs">{fmt(e.enrolled_at)}</TableCell>
                    <TableCell>
                      {e.completed ? (
                        <Badge>Completed</Badge>
                      ) : (
                        <Badge variant="secondary">In progress</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent login sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {loginSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No login data.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginSessions.slice(0, 10).map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{fmt(s.start)}</TableCell>
                      <TableCell className="text-xs">{fmt(s.end)}</TableCell>
                      <TableCell>{s.duration_minutes ?? 0} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course engagement</CardTitle>
          </CardHeader>
          <CardContent>
            {courseViews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No course views.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Last viewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseViews.map((c) => (
                    <TableRow key={c.course_id}>
                      <TableCell className="font-medium">
                        {c.course_title ?? `Course ${c.course_id}`}
                      </TableCell>
                      <TableCell>{c.duration_minutes ?? 0} min</TableCell>
                      <TableCell className="text-xs">{fmt(c.last_viewed)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
