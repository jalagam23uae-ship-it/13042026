import { requireAdmin, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Trophy,
  Users,
} from 'lucide-react';

type Overview = {
  total_students?: number;
  total_courses?: number;
  total_enrollments?: number;
  total_lessons?: number;
  completed_lessons?: number;
  lesson_completion_rate?: number;
  total_tests_taken?: number;
  avg_test_score?: number;
  pass_rate?: number;
};

type CourseCompletion = {
  course: string;
  enrolled: number;
  completed?: number;
  completion_rate: number;
  total_lessons: number;
};

type QuizAnalysis = {
  test: string;
  attempts: number;
  avg_score: number;
  pass_rate: number;
};

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const token = await getSessionToken();
  const client = serverClient(token);

  const [overviewResult, completionResult, quizResult] = await Promise.all([
    client.GET('/analytics/overview', {}),
    client.GET('/analytics/course-completion', {}),
    client.GET('/analytics/quiz-analysis', {}),
  ]);
  const overview = (overviewResult.data ?? {}) as Overview;
  const completion = (Array.isArray(completionResult.data) ? completionResult.data : []) as CourseCompletion[];
  const quizzes = (Array.isArray(quizResult.data) ? quizResult.data : []) as QuizAnalysis[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Platform-wide engagement and performance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Students" value={overview.total_students ?? 0} />
        <Stat icon={BookOpen} label="Courses" value={overview.total_courses ?? 0} />
        <Stat icon={GraduationCap} label="Enrollments" value={overview.total_enrollments ?? 0} />
        <Stat
          icon={CheckCircle2}
          label="Lesson completion"
          value={`${Math.round(Number(overview.lesson_completion_rate ?? 0))}%`}
        />
        <Stat icon={BarChart3} label="Tests taken" value={overview.total_tests_taken ?? 0} />
        <Stat
          icon={Trophy}
          label="Avg test score"
          value={`${Math.round(Number(overview.avg_test_score ?? 0))}`}
        />
        <Stat icon={Trophy} label="Pass rate" value={`${Math.round(Number(overview.pass_rate ?? 0))}%`} />
        <Stat
          icon={BookOpen}
          label="Lessons (completed / total)"
          value={`${overview.completed_lessons ?? 0} / ${overview.total_lessons ?? 0}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course completion</CardTitle>
        </CardHeader>
        <CardContent>
          {completion.length === 0 ? (
            <p className="text-sm text-muted-foreground">No course data.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Lessons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completion.map((row) => (
                  <TableRow key={row.course}>
                    <TableCell className="font-medium">{row.course}</TableCell>
                    <TableCell>{row.enrolled}</TableCell>
                    <TableCell>{row.completed ?? 0}</TableCell>
                    <TableCell>{row.completion_rate}%</TableCell>
                    <TableCell>{row.total_lessons}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quiz analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {quizzes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quiz data.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Avg score</TableHead>
                  <TableHead>Pass rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.map((row) => (
                  <TableRow key={row.test}>
                    <TableCell className="font-medium">{row.test}</TableCell>
                    <TableCell>{row.attempts}</TableCell>
                    <TableCell>{row.avg_score}</TableCell>
                    <TableCell>{row.pass_rate}%</TableCell>
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

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
