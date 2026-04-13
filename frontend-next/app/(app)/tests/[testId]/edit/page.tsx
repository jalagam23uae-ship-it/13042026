import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { QuestionEditor } from './question-editor';

type TestDetail = {
  id: number;
  title: string;
  pass_mark?: number | null;
  duration_min?: number | null;
  question_count?: number | null;
  questions?: Array<{
    id: number;
    body: string;
    option_a?: string | null;
    option_b?: string | null;
    option_c?: string | null;
    option_d?: string | null;
    correct_opt?: string | null;
    marks?: number | null;
  }> | null;
};

export default async function EditTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const user = await requireUser();
  if (user.role !== 'admin' && user.role !== 'instructor') {
    redirect('/tests');
  }
  const { testId } = await params;
  const id = Number(testId);
  if (!Number.isFinite(id)) notFound();

  const token = await getSessionToken();
  const client = serverClient(token);
  const { data, error } = await client.GET('/tests/{test_id}' as never, {
    params: { path: { test_id: id } },
  } as never);

  if (error || !data) notFound();
  const test = data as TestDetail;
  const questions = test.questions ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/tests">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-3.5" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{test.title}</h1>
          <p className="text-sm text-muted-foreground">
            Edit questions ·{' '}
            <Badge variant="secondary">{questions.length} questions</Badge>{' '}
            <Badge variant="outline">Pass {test.pass_mark ?? 60}%</Badge>{' '}
            <Badge variant="outline">{test.duration_min ?? 30} min</Badge>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questions</CardTitle>
          <CardDescription>
            Multiple-choice questions with one correct answer (A–D). Students will see options but
            not the correct answer until they submit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuestionEditor testId={id} initialQuestions={questions} />
        </CardContent>
      </Card>
    </div>
  );
}
