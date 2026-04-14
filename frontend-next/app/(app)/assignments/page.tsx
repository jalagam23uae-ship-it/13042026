import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { CreateAssignmentDialog } from './_components/create-assignment-dialog';
import { SubmitAssignmentDialog } from './_components/submit-assignment-dialog';
import { ManageAssignmentDialog } from './_components/manage-assignment-dialog';
import { AssignmentRowActions } from '@/components/admin/assignments/assignment-row-actions';

type Assignment = {
  id: number;
  title: string;
  description?: string | null;
  course_id?: number | null;
  course_title?: string | null;
  due_date?: string | null;
  max_score?: number | null;
  is_active?: boolean | null;
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
  const canCreate = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'instructor';
  const isStudent = user.role?.toLowerCase() === 'student';
  const token = await getSessionToken();
  const client = serverClient(token);

  const [allResult, mineResult, adminCoursesResult] = await Promise.all([
    client.GET('/assignments/all' as never, {} as never),
    client.GET('/assignments/my-submissions' as never, {} as never),
    canCreate
      ? client.GET('/enrollments/admin/courses' as never, {} as never)
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
          <p className="text-sm text-muted-foreground">
            {canCreate
              ? 'Manage assignments and grade student submissions.'
              : 'Assignments across your enrolled courses.'}
          </p>
        </div>
        {canCreate ? <CreateAssignmentDialog courses={adminCourses} /> : null}
      </div>

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
                  <TableHead>Course</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Max score</TableHead>
                  {isStudent && <TableHead>Status</TableHead>}
                  {isStudent && <TableHead>My score</TableHead>}
                  <TableHead className="text-right">
                    {canCreate ? 'Manage' : 'Action'}
                  </TableHead>
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
                          <Badge variant="destructive" className="ml-2">Overdue</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.course_title ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">{fmt(a.due_date)}</TableCell>
                      <TableCell>{a.max_score ?? '—'}</TableCell>

                      {/* Student-only columns */}
                      {isStudent && (
                        <TableCell>
                          <Badge variant={sub?.graded ? 'default' : sub ? 'secondary' : 'outline'}>
                            {status}
                          </Badge>
                        </TableCell>
                      )}
                      {isStudent && (
                        <TableCell>
                          {sub?.score != null
                            ? `${sub.score}${a.max_score ? ` / ${a.max_score}` : ''}`
                            : '—'}
                        </TableCell>
                      )}

                      {/* Action column */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Admin/Instructor: Manage submissions + Edit/Delete */}
                          {canCreate && (
                            <>
                              <ManageAssignmentDialog assignment={a} />
                              <AssignmentRowActions
                                assignment={{
                                  id: a.id,
                                  course_id: a.course_id ?? 0,
                                  course_title: a.course_title ?? undefined,
                                  title: a.title,
                                  description: a.description ?? null,
                                  due_date: a.due_date ?? null,
                                  max_score: a.max_score ?? 100,
                                  is_active: a.is_active ?? true,
                                }}
                                courses={adminCourses}
                              />
                            </>
                          )}
                          {/* Student: Submit button */}
                          {isStudent && !sub && (
                            <SubmitAssignmentDialog
                              assignmentId={a.id}
                              assignmentTitle={a.title}
                            />
                          )}
                          {isStudent && sub && (
                            <span className="text-xs text-muted-foreground">Submitted</span>
                          )}
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
