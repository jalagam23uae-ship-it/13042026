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
  Calendar,
  Clock,
  FileText,
  BarChart2,
  UserCheck,
  Settings,
  ShieldAlert,
} from 'lucide-react';
import { getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

type UserItem = { id: number; name: string; role: string; is_active?: boolean | null };
type SessionItem = {
  id: number;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  instructor?: string | null;
};
type ResultItem = { id: number; passed?: boolean | null };
type ApprovalItem = { id: number; request_type?: string | null; status?: string | null };

function fmtDate(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_COLOR: Record<string, string> = {
  live:       'bg-emerald-100 text-emerald-700 border border-emerald-200',
  active:     'bg-emerald-100 text-emerald-700 border border-emerald-200',
  ongoing:    'bg-emerald-100 text-emerald-700 border border-emerald-200',
  scheduled:  'bg-blue-100   text-blue-700   border border-blue-200',
  upcoming:   'bg-blue-100   text-blue-700   border border-blue-200',
  completed:  'bg-gray-100   text-gray-600   border border-gray-200',
  cancelled:  'bg-red-100    text-red-600    border border-red-200',
};

export async function AdminDashboard({ name, email, role }: { name: string; email: string; role: string }) {
  const token = await getSessionToken();
  const client = serverClient(token);

  const [usersRes, sessionsRes, resultsRes, coursesRes, approvalsRes] = await Promise.all([
    client.GET('/users/'               as never, {} as never),
    client.GET('/sessions/'            as never, {} as never),
    client.GET('/results/all'          as never, {} as never),
    client.GET('/enrollments/admin/courses' as never, {} as never),
    client.GET('/approvals/pending'    as never, {} as never),
  ]);

  const users     = (Array.isArray(usersRes.data)     ? usersRes.data     : []) as UserItem[];
  const sessions  = (Array.isArray(sessionsRes.data)  ? sessionsRes.data  : []) as SessionItem[];
  const results   = (Array.isArray(resultsRes.data)   ? resultsRes.data   : []) as ResultItem[];
  type CourseItem = { id: number; is_active?: boolean | null; category?: string | null; enrollment_count?: number | null };
  const courses   = (Array.isArray(coursesRes.data)   ? coursesRes.data   : []) as CourseItem[];
  const approvals = (Array.isArray(approvalsRes.data) ? approvalsRes.data : []) as ApprovalItem[];

  const totalUsers      = users.length;
  const totalStudents   = users.filter(u => u.role === 'student').length;
  const totalCourses    = courses.length;
  const activeCourses   = courses.filter(c => c.is_active !== false).length;
  const inactiveCourses = courses.filter(c => c.is_active === false).length;
  const totalEnrolled   = courses.reduce((sum, c) => sum + Number(c.enrollment_count ?? 0), 0);
  const categoryCount   = new Set(courses.map(c => c.category).filter(Boolean)).size;
  const passRate        = results.length
    ? Math.round((results.filter(r => r.passed).length / results.length) * 100) : 0;
  const pendingApprovals = approvals.length;

  const now = Date.now();
  const upcomingSessions = sessions
    .filter(s => s.start_time && new Date(s.start_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime())
    .slice(0, 4);

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.start_time ?? 0).getTime() - new Date(a.start_time ?? 0).getTime())
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Welcome back, {name.split(/\s+/)[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium">{email}</span>
            <Badge variant="secondary" className="ml-2 capitalize">{role}</Badge>
          </p>
        </div>
      </div>

      {/* ── Top stats ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen} color="bg-indigo-100 text-indigo-600"
          title="Total Courses" value={totalCourses}
          hint={`${categoryCount} categor${categoryCount !== 1 ? 'ies' : 'y'}`}
          href="/courses"
        />
        <StatCard
          icon={Activity} color="bg-emerald-100 text-emerald-600"
          title="Active Courses" value={activeCourses}
          hint={inactiveCourses ? `${inactiveCourses} inactive` : 'All published'}
          href="/courses"
        />
        <StatCard
          icon={GraduationCap} color="bg-blue-100 text-blue-600"
          title="Total Enrolled" value={totalEnrolled}
          hint={`${totalStudents} student${totalStudents !== 1 ? 's' : ''} total`}
          href="/enrollments"
        />
        <StatCard
          icon={Users} color="bg-violet-100 text-violet-600"
          title="Users" value={totalUsers}
          hint={`${users.filter(u => u.role === 'instructor').length} instructors`}
          href="/admin/users"
        />
      </div>

      {/* ── Mid row ────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upcoming sessions — shows list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-100">
                  <Calendar className="size-3.5 text-blue-600" />
                </div>
                Upcoming sessions
              </CardTitle>
              <Link href="/sessions" className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }), 'h-7 text-xs gap-1')}>
                All <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <Calendar className="size-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No upcoming sessions scheduled.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingSessions.map(s => (
                  <div key={s.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-50">
                      <Clock className="size-3.5 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{s.title ?? 'Untitled'}</p>
                      <p className="text-[11px] text-muted-foreground">{fmtDate(s.start_time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending approvals */}
        <Link href="/admin/approvals" className="block">
          <Card className={cn(
            'h-full transition-colors hover:bg-accent cursor-pointer',
            pendingApprovals > 0 ? 'border-amber-200 bg-amber-50/50' : '',
          )}>
            <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
              <div className={cn(
                'flex size-14 items-center justify-center rounded-2xl',
                pendingApprovals > 0 ? 'bg-amber-100' : 'bg-muted',
              )}>
                <AlertTriangle className={cn('size-7', pendingApprovals > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
              </div>
              <div className="text-center">
                <div className={cn('text-4xl font-bold tracking-tight', pendingApprovals > 0 && 'text-amber-600')}>
                  {pendingApprovals}
                </div>
                <p className="mt-1 text-sm font-medium text-muted-foreground">Pending approvals</p>
              </div>
              {pendingApprovals > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
                  Needs attention
                </span>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Test attempts */}
        <Link href="/admin/analytics" className="block">
          <Card className="h-full transition-colors hover:bg-accent cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100">
                <ClipboardList className="size-7 text-violet-600" />
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold tracking-tight">{results.length}</div>
                <p className="mt-1 text-sm font-medium text-muted-foreground">Test attempts</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">
                {passRate}% pass rate
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Bottom row ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent sessions table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="size-4 text-muted-foreground" />
                Recent sessions
              </CardTitle>
              <Link href="/sessions" className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }), 'h-7 text-xs')}>
                All <ArrowRight className="size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No sessions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title ?? 'Untitled'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(s.start_time)}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                          STATUS_COLOR[s.status ?? ''] ?? 'bg-gray-100 text-gray-600',
                        )}>
                          {s.status ?? '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {[
              { href: '/admin/users',            icon: Users,       label: 'Manage users' },
              { href: '/admin/approvals',         icon: ShieldAlert, label: 'Review approvals' },
              { href: '/admin/audit-logs',        icon: FileText,    label: 'Audit logs' },
              { href: '/admin/reports',           icon: BarChart2,   label: 'Reports' },
              { href: '/admin/student-tracking',  icon: UserCheck,   label: 'Student tracking' },
              { href: '/admin/settings',          icon: Settings,    label: 'Settings' },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{label}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── helpers ──────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  color,
  title,
  value,
  hint,
  href,
}: {
  icon: typeof BookOpen;
  color: string;
  title: string;
  value: string | number;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="block rounded-xl border bg-card p-5 transition-colors hover:bg-accent group">
      <div className="flex items-start justify-between gap-2">
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', color)}>
          <Icon className="size-5" />
        </div>
        <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="mt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
    </Link>
  );
}
