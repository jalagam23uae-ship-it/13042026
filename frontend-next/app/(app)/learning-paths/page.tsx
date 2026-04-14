import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Route } from 'lucide-react';
import { EnrollPathButton } from './enroll-path-button';
import { CreatePathDialog } from './create-path-dialog';
import { PathRowActions } from '../admin/learning-paths/path-row-actions';

type LearningPath = {
  id: number;
  title: string;
  description?: string | null;
  total_courses?: number | null;
  duration_weeks?: number | null;
  difficulty?: string | null;
  enrolled?: boolean | null;
};

export default async function LearningPathsPage() {
  const user = await requireUser();
  const isAdmin = user.role?.toLowerCase() === 'admin';
  const canManage = isAdmin || user.role?.toLowerCase() === 'instructor';
  const token = await getSessionToken();
  const client = serverClient(token);

  const [pathsResult, coursesResult] = await Promise.all([
    client.GET('/learning-paths/', {}),
    canManage ? client.GET('/enrollments/admin/courses', {}) : Promise.resolve({ data: [] }),
  ]);
  const paths = (Array.isArray(pathsResult.data) ? pathsResult.data : []) as LearningPath[];
  const adminCourses = (Array.isArray(coursesResult.data) ? coursesResult.data : []) as Array<{
    id: number; title: string; category?: string | null;
  }>;
  const error = pathsResult.error;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learning Paths</h1>
          <p className="text-sm text-muted-foreground">
            Curated sequences of courses to build a skill end-to-end.
          </p>
        </div>
        {canManage ? <CreatePathDialog courses={adminCourses} /> : null}
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load learning paths.
          </CardContent>
        </Card>
      ) : paths.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No learning paths yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {paths.map((path) => (
            <Card key={path.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Route className="size-5 text-primary" />
                  <div className="flex items-center gap-1">
                    {path.difficulty ? (
                      <Badge variant="outline" className="capitalize">
                        {path.difficulty}
                      </Badge>
                    ) : null}
                    {canManage && <PathRowActions id={path.id} />}
                  </div>
                </div>
                <CardTitle className="mt-2 text-base">{path.title}</CardTitle>
                {path.description ? (
                  <CardDescription className="line-clamp-2">{path.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {path.total_courses ? <span>{path.total_courses} courses</span> : null}
                  {path.duration_weeks ? <span>{path.duration_weeks} weeks</span> : null}
                </div>
              </CardContent>
              <CardFooter>
                <EnrollPathButton pathId={path.id} enrolled={Boolean(path.enrolled)} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
