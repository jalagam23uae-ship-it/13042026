import Link from 'next/link';
import { getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buttonVariants } from '@/components/ui/button';
import { ClipboardList, Pencil } from 'lucide-react';
import { CreateTestForm } from './create-test-form';

type TestRow = {
  id: number;
  title: string;
  course_id?: number | null;
  pass_mark?: number | null;
  duration_min?: number | null;
  is_active?: boolean | null;
  question_count?: number | null;
};

type AdminCourse = { id: number; title: string };

export default async function AdminTestsPage() {
  const token = await getSessionToken();
  const client = serverClient(token);

  const [testsRes, coursesRes] = await Promise.all([
    client.GET('/tests/', {}),
    client.GET('/enrollments/admin/courses', {}),
  ]);

  const tests = (Array.isArray(testsRes.data) ? testsRes.data : []) as TestRow[];
  const courses = (Array.isArray(coursesRes.data) ? coursesRes.data : []) as AdminCourse[];
  const courseTitles = new Map(courses.map((c) => [c.id, c.title]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ClipboardList className="size-5 text-muted-foreground" />
          Manage tests
        </h1>
        <p className="text-sm text-muted-foreground">
          Create tests and edit their questions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New test</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTestForm courses={courses} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All tests ({tests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tests yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Questions</TableHead>
                  <TableHead className="text-right">Pass %</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>
                      {t.course_id ? courseTitles.get(t.course_id) ?? `#${t.course_id}` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.question_count ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.pass_mark ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.duration_min ? `${t.duration_min}m` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? 'secondary' : 'outline'}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/tests/${t.id}/edit`}
                        className={buttonVariants({ size: 'sm', variant: 'ghost' })}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Link>
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
