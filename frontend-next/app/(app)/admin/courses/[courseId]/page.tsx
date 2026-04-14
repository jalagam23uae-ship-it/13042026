import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { EditCourseForm } from './_components/edit-course-form';
import { CourseContentManager } from './_components/course-content-manager';
import type { Lesson, Section } from '@/types/course';

type CourseDetailResponse = {
  course?: {
    id: number;
    title: string;
    description?: string | null;
    category?: string | null;
    thumbnail_url?: string | null;
  };
  total_lessons?: number;
  sections?: Section[];
  lessons?: Lesson[];
};

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await requireAdmin();
  const { courseId } = await params;
  const id = Number(courseId);
  if (Number.isNaN(id)) notFound();

  const token = await getSessionToken();
  const client = serverClient(token);

  const [detailResult, adminCoursesResult] = await Promise.all([
    client.GET('/lessons/course/{course_id}', { params: { path: { course_id: id } } }),
    client.GET('/enrollments/admin/courses', {}),
  ]);

  const detail = (detailResult.data ?? {}) as CourseDetailResponse;
  const course = detail.course;
  if (!course) notFound();

  // Course metadata from admin list (has category, description, is_active)
  const adminCourses = (
    Array.isArray(adminCoursesResult.data) ? adminCoursesResult.data : []
  ) as Array<{
    id: number;
    title: string;
    description?: string | null;
    category?: string | null;
    thumbnail_url?: string | null;
  }>;
  const adminRow = adminCourses.find((c) => c.id === id) ?? course;

  const lessons: Lesson[] = Array.isArray(detail.lessons) ? detail.lessons : [];
  const sections: Section[] = Array.isArray(detail.sections) ? detail.sections : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/courses"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft />
          Back to courses
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{adminRow.title}</h1>
          <p className="text-xs text-muted-foreground">
            Course #{id} · {sections.length} sections · {lessons.length} lessons
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course details</CardTitle>
          <CardDescription>Edit title, description, category, and thumbnail.</CardDescription>
        </CardHeader>
        <CardContent>
          <EditCourseForm
            courseId={id}
            initial={{
              title: adminRow.title,
              description: adminRow.description ?? '',
              category: adminRow.category ?? '',
              thumbnail_url: adminRow.thumbnail_url ?? '',
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-muted-foreground" />
            Sections & lessons
          </CardTitle>
          <CardDescription>
            Organise lessons into sections. Upload video and attachment files per lesson.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseContentManager
            courseId={id}
            initialSections={sections}
            initialLessons={lessons}
          />
        </CardContent>
      </Card>
    </div>
  );
}
