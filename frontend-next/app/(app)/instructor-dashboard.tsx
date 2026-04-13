import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  Users,
  MessageSquare,
  ArrowRight,
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

type SessionItem = {
  id: number;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  instructor_id?: number | null;
};

type AssignmentItem = {
  id: number;
  title?: string | null;
  due_date?: string | null;
  course_id?: number | null;
  max_score?: number | null;
};

type CourseItem = { id: number; title?: string | null; lessons_count?: number | null; enrolled_count?: number | null };

export async function InstructorDashboard({
  id,
  name,
  email,
  role,
}: {
  id: number;
  name: string;
  email: string;
  role: string;
}) {
  const token = await getSessionToken();
  const client = serverClient(token);

  const [sessionsRes, assignmentsRes, coursesRes] = await Promise.all([
    client.GET('/sessions/' as never, {} as never as never as never),
    client.GET('/assignments/all' as never, {} as never as never as never),
    client.GET('/enrollments/admin/courses' as never, {} as never as never as never),
  ]);

  const sessions = (Array.isArray(sessionsRes.data) ? sessionsRes.data : []) as SessionItem[];
  const assignments = (Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []) as AssignmentItem[];
  const courses = (Array.isArray(coursesRes.data) ? coursesRes.data : []) as CourseItem[];

  const mySessions = sessions.filter((s) => s.instructor_id === id);
  const now = Date.now();
  const upcomingSessions = mySessions
    .filter((s) => s.start_time && new Date(s.start_time).getTime() > now)
    .sort((a, b) => new Date(a.start_time ?? 0).getTime() - new Date(b.start_time ?? 0).getTime());
  const pastSessions = mySessions
    .filter((s) => s.start_time && new Date(s.start_time).getTime() <= now)
    .sort((a, b) => new Date(b.start_time ?? 0).getTime() - new Date(a.start_time ?? 0).getTime());

  const totalStudents = courses.reduce((n, c) => n + Number(c.enrolled_count ?? 0), 0);
  const totalLessons = courses.reduce((n, c) => n + Number(c.lessons_count ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Welcome back, {name.split(/\s+/)[0] ?? name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Instructor workspace · <span className="font-medium">{email}</span>
          <Badge variant="secondary" className="ml-2 capitalize">
            {role}
          </Badge>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} title="My courses" value={String(courses.length)} hint={`${totalLessons} lessons`} href="/courses" />
        <StatCard icon={Users} title="Students" value={String(totalStudents)} hint="Across all courses" href="/admin/student-tracking" />
        <StatCard icon={Calendar} title="Upcoming sessions" value={String(upcomingSessions.length)} hint={`${pastSessions.length} taught`} href="/sessions" />
        <StatCard icon={FileText} title="Assignments" value={String(assignments.length)} hint="To grade" href="/assignments" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                Upcoming sessions
              </CardTitle>
              <Link href="/sessions" className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }))}>
                All <ArrowRight />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
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
                  {upcomingSessions.slice(0, 5).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title ?? 'Untitled'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.start_time ? new Date(s.start_time).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {s.status ?? 'scheduled'}
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
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="size-4 text-muted-foreground" />
                Recent assignments
              </CardTitle>
              <Link href="/assignments" className={cn(buttonVariants({ size: 'sm', variant: 'ghost' }))}>
                All <ArrowRight />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments yet.</p>
            ) : (
              assignments.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span className="font-medium truncate">{a.title ?? 'Untitled'}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No due date'}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <QuickLink href="/courses" icon={BookOpen} label="Manage courses" />
          <QuickLink href="/sessions" icon={Calendar} label="Create session" />
          <QuickLink href="/assignments" icon={FileText} label="Grade submissions" />
          <QuickLink href="/tests" icon={ClipboardList} label="Create test" />
          <QuickLink href="/announcements" icon={MessageSquare} label="Post announcement" />
          <QuickLink href="/feedback" icon={Trophy} label="View feedback" />
        </CardContent>
      </Card>
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

function QuickLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof BookOpen }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
    >
      <span className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
      </span>
      <ArrowRight className="size-3.5 text-muted-foreground" />
    </Link>
  );
}
