import { getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap } from 'lucide-react';
import { EnrollmentsClient } from './enrollments-client';

type EnrollmentRow = {
  id: number;
  user_id: number;
  course_id: number;
  course_title?: string;
  enrolled_at?: string;
  completed?: boolean;
  completion_pct?: number;
};

type UserRow = { id: number; name: string; email: string; role: string };
type CourseRow = { id: number; title: string };

export default async function AdminEnrollmentsPage() {
  const token = await getSessionToken();
  const client = serverClient(token);

  const [enrRes, usersRes, coursesRes] = await Promise.all([
    client.GET('/enrollments/all', {}),
    client.GET('/users/', {}),
    client.GET('/enrollments/admin/courses', {}),
  ]);

  const enrollments = (Array.isArray(enrRes.data) ? enrRes.data : []) as EnrollmentRow[];
  const users = (Array.isArray(usersRes.data) ? usersRes.data : []) as UserRow[];
  const courses = (Array.isArray(coursesRes.data) ? coursesRes.data : []) as CourseRow[];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const activeCount = enrollments.filter((e) => !e.completed).length;
  const doneCount = enrollments.filter((e) => e.completed).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <GraduationCap className="size-5 text-muted-foreground" />
          Enrollments
        </h1>
        <p className="text-sm text-muted-foreground">
          Oversee all course enrollments, bulk-enroll students, and revoke.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total" value={enrollments.length} />
        <StatTile label="Active" value={activeCount} />
        <StatTile label="Completed" value={doneCount} />
      </div>

      <EnrollmentsClient users={users} courses={courses} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No enrollments yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((e) => {
                  const user = userMap.get(e.user_id);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{user?.name ?? `#${e.user_id}`}</TableCell>
                      <TableCell className="text-xs">{user?.email ?? '—'}</TableCell>
                      <TableCell>{e.course_title ?? `#${e.course_id}`}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {e.completion_pct ?? 0}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.completed ? 'secondary' : 'outline'}>
                          {e.completed ? 'Completed' : 'Active'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
