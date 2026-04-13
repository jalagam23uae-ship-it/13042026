import Link from 'next/link';
import { getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessagesSquare } from 'lucide-react';

type AdminCourse = { id: number; title: string };

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
  content: string;
  author_name?: string;
  created_at?: string | null;
  replies?: DiscussionPost[];
};

export default async function AdminDiscussionsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const token = await getSessionToken();
  const client = serverClient(token);
  const params = await searchParams;
  const courseId = params.courseId ? Number(params.courseId) : null;

  const { data: coursesData } = await client.GET('/enrollments/admin/courses', {});
  const courses = (Array.isArray(coursesData) ? coursesData : []) as AdminCourse[];

  let course: CourseDetail | null = null;
  let lessonsWithPosts: Array<{
    lessonId: number;
    lessonTitle: string;
    postCount: number;
  }> = [];

  if (courseId) {
    const { data } = await client.GET('/enrollments/courses/{course_id}/detail', {
      params: { path: { course_id: courseId } },
    });
    course = (data ?? null) as CourseDetail | null;

    if (course) {
      const allLessons = course.sections.flatMap((s) => s.lessons);
      const results = await Promise.all(
        allLessons.map(async (l) => {
          const { data: posts } = await client.GET('/discussions/lesson/{lesson_id}', {
            params: { path: { lesson_id: l.id } },
          });
          const arr = (Array.isArray(posts) ? posts : []) as DiscussionPost[];
          const count = arr.length + arr.reduce((n, p) => n + (p.replies?.length ?? 0), 0);
          return { lessonId: l.id, lessonTitle: l.title, postCount: count };
        }),
      );
      lessonsWithPosts = results.filter((r) => r.postCount > 0);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MessagesSquare className="size-5 text-muted-foreground" />
          Discussion moderation
        </h1>
        <p className="text-sm text-muted-foreground">
          Review and moderate lesson discussions.
        </p>
      </div>

      {course ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {course.title}
              <Link
                href="/admin/discussions"
                className="ml-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                ← All courses
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lessonsWithPosts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No discussions on any lesson yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {lessonsWithPosts.map((l) => (
                  <li key={l.lessonId}>
                    <Link
                      href={`/discussions?lessonId=${l.lessonId}`}
                      className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{l.lessonTitle}</span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {l.postCount} post{l.postCount === 1 ? '' : 's'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pick a course</CardTitle>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {courses.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/discussions?courseId=${c.id}`}
                      className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{c.title}</span>
                      <span className="text-xs text-muted-foreground">Review →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
