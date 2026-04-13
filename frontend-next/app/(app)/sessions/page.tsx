import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Clock } from 'lucide-react';
import { CreateSessionForm } from './create-session-form';
import {
  AttendeesButton,
  CheckInButton,
  CheckOutButton,
  DeleteSessionButton,
  EditSessionButton,
} from './session-actions';

type SessionItem = {
  id: number;
  title: string;
  description?: string | null;
  instructor?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  max_attendees?: number | null;
  status?: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  scheduled: 'secondary',
  live: 'default',
  completed: 'outline',
  cancelled: 'destructive',
};

export default async function SessionsPage() {
  const user = await requireUser();
  const canCreate = user.role === 'admin' || user.role === 'instructor';
  const token = await getSessionToken();
  const client = serverClient(token);

  const [sessionsResult, adminCoursesResult] = await Promise.all([
    client.GET('/sessions/', {}),
    canCreate
      ? client.GET('/enrollments/admin/courses', {})
      : Promise.resolve({ data: [] as unknown }),
  ]);
  const sessions = (Array.isArray(sessionsResult.data) ? sessionsResult.data : []) as SessionItem[];
  const error = sessionsResult.error;
  const adminCourses = (
    Array.isArray(adminCoursesResult.data) ? adminCoursesResult.data : []
  ) as Array<{ id: number; title: string }>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Live training sessions scheduled for your courses.
        </p>
      </div>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New session</CardTitle>
            <CardDescription>Admin / instructor only.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateSessionForm courses={adminCourses} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="size-4 text-muted-foreground" />
            Upcoming & past
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Failed to load sessions.</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const canCheckIn =
                    s.status === 'live' || s.status === 'scheduled' || s.status === 'active';
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.title}</TableCell>
                      <TableCell>{s.instructor ?? '—'}</TableCell>
                      <TableCell className="text-xs">{fmt(s.start_time)}</TableCell>
                      <TableCell className="text-xs">{fmt(s.end_time)}</TableCell>
                      <TableCell>
                        {s.status ? (
                          <Badge
                            variant={STATUS_VARIANT[s.status] ?? 'outline'}
                            className="capitalize"
                          >
                            <Clock className="size-3" />
                            {s.status}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canCheckIn ? (
                            <>
                              <CheckInButton sessionId={s.id} />
                              <CheckOutButton sessionId={s.id} />
                            </>
                          ) : null}
                          {canCreate ? (
                            <>
                              <AttendeesButton sessionId={s.id} title={s.title} />
                              <EditSessionButton session={s} />
                              <DeleteSessionButton sessionId={s.id} title={s.title} />
                            </>
                          ) : null}
                        </div>
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
