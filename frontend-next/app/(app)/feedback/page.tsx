import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, BarChart2, Users } from 'lucide-react';
import { FeedbackForm } from './_components/feedback-form';

type FeedbackItem = {
  id: number;
  session_id?: number | null;
  overall_rating?: number | null;
  instructor_rating?: number | null;
  content_rating?: number | null;
  pace_rating?: number | null;
  comments?: string | null;
  submitted_at?: string | null;
};

type AllFeedbackItem = FeedbackItem & {
  session_title?: string | null;
  student_name?: string | null;
};

function RatingDot({ value }: { value?: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const color =
    value >= 4 ? 'text-emerald-600 bg-emerald-100' :
    value >= 3 ? 'text-amber-600 bg-amber-100' :
    'text-red-600 bg-red-100';
  return (
    <span className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${color}`}>
      {value}
    </span>
  );
}

function fmtDate(dt?: string | null) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function FeedbackPage() {
  const user = await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const isStaff = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'instructor';

  /* ── Admin / Instructor view ──────────────────────────────── */
  if (isStaff) {
    const { data } = await client.GET('/feedback/all' as never, {} as never);
    const allFeedback = (Array.isArray(data) ? data : []) as AllFeedbackItem[];

    // Group by session
    const bySession = new Map<string, { title: string; items: AllFeedbackItem[] }>();
    for (const fb of allFeedback) {
      const key = String(fb.session_id ?? 'unknown');
      if (!bySession.has(key)) {
        bySession.set(key, {
          title: fb.session_title ?? `Session #${fb.session_id ?? '?'}`,
          items: [],
        });
      }
      bySession.get(key)!.items.push(fb);
    }

    function avgRating(items: AllFeedbackItem[], key: keyof AllFeedbackItem) {
      const vals = items.map((i) => i[key]).filter((v): v is number => typeof v === 'number');
      if (!vals.length) return null;
      return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    }

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Session Feedback</h1>
          <p className="text-sm text-muted-foreground">
            All student feedback across every session. Read-only.
          </p>
        </div>

        {/* Summary strip */}
        <div className="flex gap-4">
          <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="size-4 text-primary" />
            </div>
            <div>
              <div className="text-xl font-bold">{allFeedback.length}</div>
              <p className="text-[11px] text-muted-foreground">Total submissions</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100">
              <BarChart2 className="size-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-xl font-bold">{bySession.size}</div>
              <p className="text-[11px] text-muted-foreground">Sessions covered</p>
            </div>
          </div>
          {allFeedback.length > 0 && (
            <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100">
                <MessageSquare className="size-4 text-amber-600" />
              </div>
              <div>
                <div className="text-xl font-bold">
                  {avgRating(allFeedback, 'overall_rating') ?? '—'}
                </div>
                <p className="text-[11px] text-muted-foreground">Avg overall</p>
              </div>
            </div>
          )}
        </div>

        {allFeedback.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No feedback submitted yet.
            </CardContent>
          </Card>
        ) : (
          Array.from(bySession.entries()).map(([key, { title, items }]) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>
                      {items.length} submission{items.length !== 1 ? 's' : ''} ·
                      Overall avg: {avgRating(items, 'overall_rating') ?? '—'} /5
                    </CardDescription>
                  </div>
                  {/* Aggregate badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['overall_rating', 'instructor_rating', 'content_rating', 'pace_rating'] as const).map((k) => {
                      const avg = avgRating(items, k);
                      const label = k.replace('_rating', '').replace('overall', 'Overall').replace('instructor', 'Instr').replace('content', 'Content').replace('pace', 'Pace');
                      return avg ? (
                        <Badge key={k} variant="secondary" className="text-[10px] gap-1">
                          {label}: {avg}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {items.map((fb) => (
                  <div key={fb.id} className="rounded-lg border bg-muted/30 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{fb.student_name ?? `Student #${fb.id}`}</span>
                      <span className="text-[11px] text-muted-foreground">{fmtDate(fb.submitted_at)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">Overall <RatingDot value={fb.overall_rating} /></span>
                      <span className="flex items-center gap-1">Instructor <RatingDot value={fb.instructor_rating} /></span>
                      <span className="flex items-center gap-1">Content <RatingDot value={fb.content_rating} /></span>
                      <span className="flex items-center gap-1">Pace <RatingDot value={fb.pace_rating} /></span>
                    </div>
                    {fb.comments ? (
                      <p className="mt-2 text-xs text-muted-foreground">{fb.comments}</p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

  /* ── Student view ─────────────────────────────────────────── */
  const [myResult, sessionsResult] = await Promise.all([
    client.GET('/feedback/my' as never, {} as never),
    client.GET('/sessions/' as never, {} as never),
  ]);
  const mine = (Array.isArray(myResult.data) ? myResult.data : []) as FeedbackItem[];
  const sessions = (Array.isArray(sessionsResult.data) ? sessionsResult.data : []) as Array<{
    id: number; title: string;
  }>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Submit feedback for a session, or review what you&apos;ve already sent.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit new feedback</CardTitle>
          <CardDescription>Rate 1–5 on each dimension, add optional comments.</CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackForm sessions={sessions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-4 text-muted-foreground" />
            My feedback ({mine.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven&apos;t submitted feedback yet.</p>
          ) : (
            mine.map((fb) => (
              <div key={fb.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">Session {fb.session_id}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {fb.submitted_at ? new Date(fb.submitted_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>Overall: {fb.overall_rating ?? '—'}/5</span>
                  <span>Instructor: {fb.instructor_rating ?? '—'}/5</span>
                  <span>Content: {fb.content_rating ?? '—'}/5</span>
                  <span>Pace: {fb.pace_rating ?? '—'}/5</span>
                </div>
                {fb.comments ? <p className="mt-2">{fb.comments}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
