import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { buttonVariants } from '@/components/ui/button';
import { asArray, cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { CoursePlayer } from './_components/course-player';
import type { Lesson, Section } from '@/types/course';

type CourseDetailResponse = {
  course?: { id: number; title: string; description?: string | null };
  total_lessons?: number;
  completed_lessons?: number;
  completion_pct?: number;
  sections?: Section[];
  lessons?: Lesson[];
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  await requireUser();
  const { courseId } = await params;
  const id = Number(courseId);
  if (Number.isNaN(id)) notFound();

  const token = await getSessionToken();
  const client = serverClient(token);

  const [lessonsResult, enrollmentsResult] = await Promise.all([
    client.GET('/lessons/course/{course_id}', { params: { path: { course_id: id } } }),
    client.GET('/enrollments/my', {}),
  ]);

  const detail = (lessonsResult.data ?? {}) as CourseDetailResponse;
  const course = detail.course ?? { id, title: `Course ${id}` };
  const lessons: Lesson[] = Array.isArray(detail.lessons) ? detail.lessons : [];
  const sections: Section[] = Array.isArray(detail.sections) ? detail.sections : [];

  const enrollments = asArray<{
    course_id?: number;
    course_title?: string | null;
    progress_pct?: number | null;
  }>(enrollmentsResult.data);
  const myEnrollment = enrollments.find((e) => e.course_id === id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link
          href="/courses"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{course.title}</h1>
          <p className="text-xs text-muted-foreground">
            {lessons.length} lessons ·{' '}
            {detail.completed_lessons ?? 0} complete ·{' '}
            {detail.completion_pct ?? 0}% overall
            {myEnrollment ? null : (
              <span className="ml-2 text-destructive">(not enrolled)</span>
            )}
          </p>
        </div>
      </div>

      <CoursePlayer courseId={id} courseTitle={course.title} sections={sections} lessons={lessons} />
    </div>
  );
}
