import Link from 'next/link';
import { requireAdmin, getSessionToken } from '@/lib/auth/session';
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
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, Pencil } from 'lucide-react';
import { CreateCourseForm } from './create-course-form';
import { DeleteCourseButton } from './delete-course-button';
import { ImportDocxDialog } from './import-docx-dialog';

type AdminCourse = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  lesson_count?: number | null;
  enrollment_count?: number | null;
  is_active?: boolean | null;
};

export default async function AdminCoursesPage() {
  await requireAdmin();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/enrollments/admin/courses', {});
  const courses = (Array.isArray(data) ? data : []) as AdminCourse[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Course Management</h1>
          <p className="text-sm text-muted-foreground">
            Create, edit, and delete courses. New courses become immediately available for
            enrollment.
          </p>
        </div>
        <ImportDocxDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create a new course</CardTitle>
          <CardDescription>Students will see it on the enrollment page.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCourseForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-muted-foreground" />
            All courses ({courses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Failed to load courses.</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses yet. Create one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">
                      {course.title}
                      {course.description ? (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {course.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {course.category ? (
                        <Badge variant="outline">{course.category}</Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{course.lesson_count ?? 0}</TableCell>
                    <TableCell>{course.enrollment_count ?? 0}</TableCell>
                    <TableCell>
                      {course.is_active === false ? (
                        <Badge variant="destructive">Inactive</Badge>
                      ) : (
                        <Badge variant="secondary">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/courses/${course.id}`}
                          className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                        >
                          <Pencil />
                          Manage content
                        </Link>
                        <DeleteCourseButton id={course.id} title={course.title} />
                      </div>
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
