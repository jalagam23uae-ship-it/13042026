import Link from 'next/link';
import {
  Users,
  BookOpen,
  GraduationCap,
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Trophy,
} from 'lucide-react';
import { getSessionToken } from '@/lib/auth/session';
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

type UserItem = { id: number; name: string; email: string; role: string; is_active?: boolean | null };
type SessionItem = {
  id: number;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  instructor_id?: number | null;
};
type ResultItem = { id: number; user_id?: number | null; score?: number | null; percentage?: number | null; passed?: boolean | null };
type ApprovalItem = { id: number; request_type?: string | null; status?: string | null };

export async function AdminDashboard({ name, email, role }: { name: string; email: string; role: string }) {
  const token = await getSessionToken();
  const client = serverClient(token);

  const [usersRes, sessionsRes, resultsRes, coursesRes, approvalsRes] = await Promise.all([
    client.GET('/users/' as never, {} as never as never as never),
    client.GET('/sessions/' as never, {} as never as never as never),
    client.GET('/results/all' as never, {} as never as never as never),
    client.GET('/enrollments/admin/courses' as never, {} as never as never as never),
    client.GET('/approvals/pending' as never, {} as never as never as never),
  ]);

  const users = (Array.isArray(usersRes.data) ? usersRes.data : []) as UserItem[];
  const sessions = (Array.isArray(sessionsRes.data) ? sessionsRes.data : []) as SessionItem[];
  const results = (Array.isArray(resultsRes.data) ? resultsRes.data : []) as ResultItem[];
  const courses = (Array.isArray(coursesRes.data) ? coursesRes.data : []) as Array<{ id: number }>;
  const approvals = (Array.isArray(approvalsRes.data) ? approvalsRes.data : []) as ApprovalItem[];

  const totalUsers = users.length;
  const activeStudents = users.filter((u) => u.role === 'student' || u.role === 'user').length;
  const totalInstructors = users.filter((u) => u.role === 'instructor').length;
  const totalCourses = courses.length;
  const upcomingSessions = sessions.filter((s) => {
    if (!s.start_time) return false;
    return new Date(s.start_time).getTime() > Date.now();
  }).length;
  const passRate = results.length
    ? Math.round((results.filter((r) => r.passed).length / results.length) * 100)
    : 0;
  const pendingApprovals = approvals.length;

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.start_time ?? 0).getTime() - new Date(a.start_time ?? 0).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Welcome back, {name.split(/\s+/)[0] ?? name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Admin console · <span className="font-medium">{email}</span>
          <Badge variant="secondary" className="ml-2 capitalize">
            {role}
          </Badge>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} title="Total users" value={String(totalUsers)} hint={`${totalInstructors} instructors`} href="/admin/users" />
        <StatCard icon={GraduationCap} title="Students" value={String(activeStudents)} hint="Enrolled learners" href="/admin/student-tracking" />
        <StatCard icon={BookOpen} title="Courses" value={String(totalCourses)} hint="Published" href="/admin/courses" />
        <StatCard icon={Trophy} title="Pass rate" value={`${passRate}%`} hint={`${results.length} attempts`} href="/admin/analytics" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickCard icon={Activity} title="Upcoming sessions" value={String(upcomingSessions)} href="/sessions" />
        <QuickCard icon={AlertTriangle} title="Pending approvals" value={String(pendingApprovals)} href="/admin/approvals" accent={pendingApprovals > 0} />
        <QuickCard icon={ClipboardList} title="Test attempts" value={String(results.length)} href="/admin/analytics" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Recent sessions</CardTitle>
              <Link href="/sessions" className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }))}>
                All <ArrowRight />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions scheduled yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title ?? 'Untitled'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.start_time ? new Date(s.start_time).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {s.status ?? '—'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Quick actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <QuickLink href="/admin/users" label="Manage users" />
            <QuickLink href="/admin/courses" label="Manage courses" />
            <QuickLink href="/admin/approvals" label="Review approvals" />
            <QuickLink href="/admin/audit-logs" label="Audit logs" />
            <QuickLink href="/admin/student-tracking" label="Student tracking" />
            <QuickLink href="/admin/reports" label="Reports" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
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
    <Link href={href} className="block rounded-xl border bg-card transition-colors hover:bg-accent">
      <div className="flex items-center justify-between p-4 pb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="p-4 pt-1">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </Link>
  );
}

function QuickCard({
  icon: Icon,
  title,
  value,
  href,
  accent,
}: {
  icon: typeof BookOpen;
  title: string;
  value: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent',
        accent && 'border-destructive/50 bg-destructive/5',
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('size-4', accent ? 'text-destructive' : 'text-muted-foreground')} />
        <span className="text-sm">{title}</span>
      </div>
      <span className={cn('text-sm font-semibold', accent && 'text-destructive')}>{value}</span>
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
    >
      {label}
      <ArrowRight className="size-3.5 text-muted-foreground" />
    </Link>
  );
}
