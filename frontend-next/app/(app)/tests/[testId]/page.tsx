import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { TestRunner, type Question } from './test-runner';

type TestDetail = {
  id: number;
  title: string;
  course_id?: number | null;
  pass_mark?: number | null;
  duration_min?: number | null;
  question_count?: number | null;
  questions?: Question[];
};

export default async function TakeTestPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  await requireUser();
  const { testId } = await params;
  const id = Number(testId);
  if (Number.isNaN(id)) notFound();

  const token = await getSessionToken();
  const client = serverClient(token);
  const { data, response } = await client.GET('/tests/{test_id}', {
    params: { path: { test_id: id } },
  });

  if (response.status === 404) notFound();
  const test = (data ?? {}) as TestDetail;
  const questions = Array.isArray(test.questions) ? test.questions : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/tests" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          <ArrowLeft />
          Back
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{test.title ?? `Test ${id}`}</h1>
          <p className="text-xs text-muted-foreground">
            {questions.length} questions
            {test.duration_min ? ` · ${test.duration_min} min limit` : ''}
            {test.pass_mark ? ` · pass mark ${test.pass_mark}%` : ''}
          </p>
        </div>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">This test has no questions yet.</p>
      ) : (
        <TestRunner
          testId={id}
          durationMin={test.duration_min ?? 0}
          passMark={test.pass_mark ?? 0}
          questions={questions}
        />
      )}
    </div>
  );
}
