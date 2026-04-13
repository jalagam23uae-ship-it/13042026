import { getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Route } from 'lucide-react';
import { PathBuilder } from './path-builder';
import { PathRowActions } from './path-row-actions';

type Course = { id: number; title: string };
type PathOut = {
  id: number;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  is_active?: boolean | null;
  course_count?: number;
  courses?: Array<{ id: number; title: string; sort_order: number }>;
};

export default async function AdminLearningPathsPage() {
  const token = await getSessionToken();
  const client = serverClient(token);

  const [pathsRes, coursesRes] = await Promise.all([
    client.GET('/learning-paths/', {}),
    client.GET('/enrollments/admin/courses', {}),
  ]);

  const paths = (Array.isArray(pathsRes.data) ? pathsRes.data : []) as PathOut[];
  const courses = (Array.isArray(coursesRes.data) ? coursesRes.data : []) as Course[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Route className="size-5 text-muted-foreground" />
          Learning paths
        </h1>
        <p className="text-sm text-muted-foreground">
          Group courses into sequential learning tracks.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New learning path</CardTitle>
        </CardHeader>
        <CardContent>
          <PathBuilder courses={courses} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {paths.length === 0 ? (
          <Card className="lg:col-span-2">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No learning paths yet.
            </CardContent>
          </Card>
        ) : (
          paths.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.description ?? 'No description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary">{p.course_count ?? 0} courses</Badge>
                    <PathRowActions id={p.id} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(p.courses ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No courses attached.</p>
                ) : (
                  <ol className="flex flex-col gap-1 text-sm">
                    {(p.courses ?? [])
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((c, idx) => (
                        <li
                          key={c.id}
                          className="flex items-center gap-2 rounded-md border px-2 py-1"
                        >
                          <span className="size-5 rounded-full bg-muted text-center text-xs leading-5 text-muted-foreground">
                            {idx + 1}
                          </span>
                          <span className="truncate">{c.title}</span>
                        </li>
                      ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
