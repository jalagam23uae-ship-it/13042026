import { getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText } from 'lucide-react';
import { AssignmentForm } from './assignment-form';
import { AssignmentRowActions } from './assignment-row-actions';

type AdminCourse = { id: number; title: string };

type AssignmentRow = {
  id: number;
  course_id: number;
  course_title?: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  max_score: number;
  is_active: boolean;
};

export default async function AdminAssignmentsPage() {
  const token = await getSessionToken();
  const client = serverClient(token);

  const [assignmentsRes, coursesRes] = await Promise.all([
    client.GET('/assignments/all', {}),
    client.GET('/enrollments/admin/courses', {}),
  ]);

  const assignments = (Array.isArray(assignmentsRes.data)
    ? assignmentsRes.data
    : []) as AssignmentRow[];
  const courses = (Array.isArray(coursesRes.data) ? coursesRes.data : []) as AdminCourse[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FileText className="size-5 text-muted-foreground" />
          Manage assignments
        </h1>
        <p className="text-sm text-muted-foreground">
          Create and grade assignments for your courses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New assignment</CardTitle>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Create a course first before adding assignments.
            </p>
          ) : (
            <AssignmentForm courses={courses} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All assignments ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No assignments yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Max score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>{a.course_title ?? `#${a.course_id}`}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {a.due_date ? new Date(a.due_date).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{a.max_score}</TableCell>
                    <TableCell>
                      <Badge variant={a.is_active ? 'secondary' : 'outline'}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <AssignmentRowActions assignment={a} courses={courses} />
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
