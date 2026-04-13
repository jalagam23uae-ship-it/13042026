import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { FeedbackForm } from './feedback-form';

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

export default async function FeedbackPage() {
  await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const [myResult, sessionsResult] = await Promise.all([
    client.GET('/feedback/my', {}),
    client.GET('/sessions/', {}),
  ]);
  const mine = (Array.isArray(myResult.data) ? myResult.data : []) as FeedbackItem[];
  const sessions = (Array.isArray(sessionsResult.data) ? sessionsResult.data : []) as Array<{
    id: number;
    title: string;
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
