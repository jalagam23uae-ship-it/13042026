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
import { FileText } from 'lucide-react';
import { CreateAssignmentForm } from './create-assignment-form';
import { SubmitAssignmentDialog } from './submit-assignment-dialog';

type Assignment = {
  id: number;
  title: string;
  description?: string | null;
  course_id?: number | null;
  due_date?: string | null;
  max_score?: number | null;
};

type Submission = {
  id: number;
  assignment_id: number;
  score?: number | null;
  graded?: boolean | null;
  submitted_at?: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString();
}

export default async function AssignmentsPage() {
  const user = await requireUser();
  const canCreate = user.role === 'admin' || user.role === 'instructor';
  const token = await getSessionToken();
  const client = serverClient(token);

  const [allResult, mineResult, adminCoursesResult] = await Promise.all([
    client.GET('/assignments/all', {}),
    client.GET('/assignments/my-submissions', {}),
    canCreate
      ? client.GET('/enrollments/admin/courses', {})
      : Promise.resolve({ data: [] as unknown }),
  ]);
  const assignments = (Array.isArray(allResult.data) ? allResult.data : []) as Assignment[];
  const submissions = (Array.isArray(mineResult.data) ? mineResult.data : []) as Submission[];
  const adminCourses = (
    Array.isArray(adminCoursesResult.data) ? adminCoursesResult.data : []
  ) as Array<{ id: number; title: string }>;
  const submissionMap = new Map<number, Submission>();
  submissions.forEach((s) => submissionMap.set(s.assignment_id, s));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
        <p className="text-sm text-muted-foreground">
          Assignments across your enrolled courses.
        </p>
      </div>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New assignment</CardTitle>
            <CardDescription>Admin / instructor only.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateAssignmentForm courses={adminCourses} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4 text-muted-foreground" />
            Assignments ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Max score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>My score</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => {
                  const sub = submissionMap.get(a.id);
                  const status = !sub
                    ? 'Not submitted'
                    : sub.graded
                      ? 'Graded'
                      : 'Submitted';
                  const overdue =
                    a.due_date && !sub && new Date(a.due_date).getTime() < Date.now();
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.title}
                        {overdue ? (
                          <Badge variant="destructive" className="ml-2">
                            Overdue
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs">{fmt(a.due_date)}</TableCell>
                      <TableCell>{a.max_score ?? '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={sub?.graded ? 'default' : sub ? 'secondary' : 'outline'}
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub?.score != null
                          ? `${sub.score}${a.max_score ? ` / ${a.max_score}` : ''}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {!sub ? (
                          <SubmitAssignmentDialog
                            assignmentId={a.id}
                            assignmentTitle={a.title}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Submitted</span>
                        )}
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
