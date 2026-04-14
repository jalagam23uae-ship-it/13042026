import Link from 'next/link';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessagesSquare } from 'lucide-react';
import { LessonDiscussion } from './_components/lesson-discussion';

type Enrollment = {
  id: number;
  course_id: number;
  course_title?: string | null;
};

type CourseDetail = {
  id: number;
  title: string;
  sections: Array<{
    id: number | null;
    title: string;
    lessons: Array<{ id: number; title: string }>;
  }>;
};

type DiscussionPost = {
  id: number;
  lesson_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  is_answer?: boolean | null;
  created_at?: string | null;
  author_name?: string;
  replies?: DiscussionPost[];
};

export default async function DiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ lessonId?: string; courseId?: string }>;
}) {
  const user = await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);
  const params = await searchParams;
  const lessonId = params.lessonId ? Number(params.lessonId) : null;
  const courseId = params.courseId ? Number(params.courseId) : null;

  const { data: enrollmentsData } = await client.GET('/enrollments/my', {});
  const enrollments = (Array.isArray(enrollmentsData) ? enrollmentsData : []) as Enrollment[];

  if (lessonId) {
    const { data: postsData } = await client.GET('/discussions/lesson/{lesson_id}', {
      params: { path: { lesson_id: lessonId } },
    });
    const posts = (Array.isArray(postsData) ? postsData : []) as DiscussionPost[];
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/discussions"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            ← All discussions
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <MessagesSquare className="size-5 text-muted-foreground" />
            Lesson #{lessonId} discussion
          </h1>
        </div>
        <LessonDiscussion
          lessonId={lessonId}
          initialPosts={posts}
          currentUserId={user.id}
          currentRole={user.role}
        />
      </div>
    );
  }

  // Course picker view
  let course: CourseDetail | null = null;
  if (courseId) {
    const { data } = await client.GET('/enrollments/courses/{course_id}/detail', {
      params: { path: { course_id: courseId } },
    });
    course = (data ?? null) as CourseDetail | null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MessagesSquare className="size-5 text-muted-foreground" />
          Discussions
        </h1>
        <p className="text-sm text-muted-foreground">
          Ask questions and discuss lessons with your instructors and peers.
        </p>
      </div>

      {course ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{course.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {course.sections.map((section) => (
              <div key={`${section.id ?? 'general'}`} className="rounded-md border">
                <div className="border-b bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </div>
                <ul className="divide-y">
                  {section.lessons.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/discussions?lessonId=${l.id}`}
                        className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                      >
                        <span>{l.title}</span>
                        <span className="text-xs text-muted-foreground">Open →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <Link
              href="/discussions"
              className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              ← Pick another course
            </Link>
          </CardContent>
        </Card>
      ) : enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You&apos;re not enrolled in any courses yet.{' '}
            <Link href="/enrollments" className="underline underline-offset-2">
              Browse the catalog
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pick a course</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {enrollments.map((enr) => (
                <li key={enr.id}>
                  <Link
                    href={`/discussions?courseId=${enr.course_id}`}
                    className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-accent"
                  >
                    <span className="font-medium">
                      {enr.course_title ?? `Course #${enr.course_id}`}
                    </span>
                    <span className="text-xs text-muted-foreground">Pick a lesson →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
