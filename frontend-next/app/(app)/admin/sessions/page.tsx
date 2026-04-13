import { getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from 'lucide-react';
import { SessionForm } from './session-form';
import { SessionRowActions } from './session-row-actions';

type SessionRow = {
  id: number;
  title: string;
  description?: string | null;
  instructor?: string | null;
  course_id?: number | null;
  start_time: string;
  end_time: string;
  status?: string | null;
  duration_hrs?: number | null;
};

type AdminCourse = { id: number; title: string };

export default async function AdminSessionsPage() {
  const token = await getSessionToken();
  const client = serverClient(token);

  const [sessionsRes, coursesRes] = await Promise.all([
    client.GET('/sessions/', {}),
    client.GET('/enrollments/admin/courses', {}),
  ]);

  const sessions = (Array.isArray(sessionsRes.data) ? sessionsRes.data : []) as SessionRow[];
  const courses = (Array.isArray(coursesRes.data) ? coursesRes.data : []) as AdminCourse[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Calendar className="size-5 text-muted-foreground" />
          Manage sessions
        </h1>
        <p className="text-sm text-muted-foreground">
          Create, edit, and delete classroom sessions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New session</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionForm courses={courses} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            All sessions ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No sessions yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell>{s.instructor ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(s.start_time).toLocaleString()}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {s.duration_hrs ? `${s.duration_hrs.toFixed(1)}h` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {s.status ?? 'scheduled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <SessionRowActions
                        session={{
                          id: s.id,
                          title: s.title,
                          description: s.description ?? '',
                          instructor: s.instructor ?? '',
                          course_id: s.course_id ?? null,
                          start_time: s.start_time,
                          end_time: s.end_time,
                          status: s.status ?? 'scheduled',
                        }}
                        courses={courses}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
