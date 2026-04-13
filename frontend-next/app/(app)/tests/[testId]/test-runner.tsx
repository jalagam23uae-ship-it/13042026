'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Send,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export type Question = {
  id: number;
  body: string;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  marks?: number | null;
};

type Answer = 'A' | 'B' | 'C' | 'D';

type TestResult = {
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  attempt_no: number;
};

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function TestRunner({
  testId,
  durationMin,
  passMark,
  questions,
}: {
  testId: number;
  durationMin: number;
  passMark: number;
  questions: Question[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [endTime] = useState(() =>
    durationMin > 0 ? Date.now() + durationMin * 60_000 : null,
  );
  const [timeLeft, setTimeLeft] = useState<number | null>(
    endTime ? endTime - Date.now() : null,
  );

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      const client = browserClient();
      const { data, error } = await client.POST('/tests/submit', {
        body: {
          test_id: testId,
          answers: Array.from(answers.entries()).map(([question_id, chosen_opt]) => ({
            question_id,
            chosen_opt,
          })),
        } as never,
      });
      if (error || !data) {
        toast.error('Failed to submit test.');
        return;
      }
      const raw = data as {
        score: number;
        total_marks: number;
        percentage?: string | number | null;
        passed: boolean;
        attempt_no: number;
      };
      setResult({
        score: raw.score,
        total_marks: raw.total_marks,
        percentage: Number(raw.percentage ?? 0),
        passed: raw.passed,
        attempt_no: raw.attempt_no,
      });
      setReviewOpen(false);
    } finally {
      setSubmitting(false);
    }
  }, [answers, testId]);

  function openReview() {
    setReviewOpen(true);
  }

  // Timer tick + auto-submit at zero
  useEffect(() => {
    if (!endTime) return;
    const tick = setInterval(() => {
      const left = endTime - Date.now();
      if (left <= 0) {
        clearInterval(tick);
        setTimeLeft(0);
        if (!result && !submitting) {
          toast.message('Time is up — submitting your answers.');
          submit();
        }
      } else {
        setTimeLeft(left);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [endTime, result, submit, submitting]);

  const answeredCount = answers.size;
  const q = questions[current];

  function pick(option: Answer) {
    if (!q) return;
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(q.id, option);
      return next;
    });
  }

  // Result screen
  if (result) {
    const passed = result.passed;
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            {passed ? (
              <CheckCircle2 className="size-10 text-primary" />
            ) : (
              <XCircle className="size-10 text-destructive" />
            )}
            <div>
              <CardTitle className="text-xl">
                {passed ? 'Passed' : 'Failed'}
              </CardTitle>
              <p className="text-xs text-muted-foreground">Attempt #{result.attempt_no}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Score" value={`${result.score} / ${result.total_marks}`} />
            <Stat label="Percentage" value={`${Math.round(Number(result.percentage))}%`} />
            <Stat label="Pass mark" value={`${passMark}%`} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/tests')}>Back to tests</Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setAnswers(new Map());
                setCurrent(0);
              }}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!q) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              Question {current + 1} of {questions.length}
            </CardTitle>
            <div className="flex items-center gap-2">
              {timeLeft != null ? (
                <Badge variant={timeLeft < 60_000 ? 'destructive' : 'secondary'}>
                  <Clock />
                  {formatClock(timeLeft)}
                </Badge>
              ) : null}
              <Badge variant="outline">
                {answeredCount} / {questions.length} answered
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm whitespace-pre-wrap">{q.body}</p>

          <div className="flex flex-col gap-2">
            {(['A', 'B', 'C', 'D'] as const).map((opt) => {
              const text = q[`option_${opt.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d'];
              if (!text) return null;
              const selected = answers.get(q.id) === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => pick(opt)}
                  className={cn(
                    'flex items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors',
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                    )}
                  >
                    {opt}
                  </span>
                  <span className="whitespace-pre-wrap">{text}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrent(Math.max(0, current - 1))}
              disabled={current === 0}
            >
              <ChevronLeft />
              Previous
            </Button>
            {current === questions.length - 1 ? (
              <Button
                size="sm"
                onClick={openReview}
                disabled={submitting || answeredCount === 0}
              >
                {submitting ? <Loader2 className="animate-spin" /> : <Send />}
                Review & submit
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setCurrent(Math.min(questions.length - 1, current + 1))}
              >
                Next
                <ChevronRight />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question navigator */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm">Navigator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((question, idx) => {
              const answered = answers.has(question.id);
              const isCurrent = idx === current;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrent(idx)}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-md border text-xs font-medium transition-colors',
                    isCurrent
                      ? 'border-primary bg-primary text-primary-foreground'
                      : answered
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border hover:bg-accent',
                  )}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <Button
            className="mt-3 w-full"
            size="sm"
            onClick={openReview}
            disabled={submitting || answeredCount === 0}
          >
            {submitting ? <Loader2 className="animate-spin" /> : null}
            Review & submit
          </Button>
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review your answers</DialogTitle>
            <DialogDescription>
              {answeredCount === questions.length ? (
                'All questions answered. Ready to submit?'
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600">
                  <AlertTriangle className="size-3.5" />
                  {questions.length - answeredCount} unanswered — they will be marked wrong.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto pr-1">
            <ol className="flex flex-col gap-2">
              {questions.map((question, idx) => {
                const chosen = answers.get(question.id);
                return (
                  <li
                    key={question.id}
                    className="flex items-start gap-2 rounded-md border p-2 text-sm"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="line-clamp-2 text-xs">{question.body}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {chosen ? (
                          <>
                            Your answer: <strong className="text-foreground">{chosen}</strong>
                          </>
                        ) : (
                          <span className="text-amber-600">Not answered</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrent(idx);
                        setReviewOpen(false);
                      }}
                      className="text-[10px] text-primary underline underline-offset-2"
                    >
                      Go
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewOpen(false)} disabled={submitting}>
              Keep editing
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Send />}
              Submit final answers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
