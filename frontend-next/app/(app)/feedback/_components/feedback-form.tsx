'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

export function FeedbackForm({
  sessions,
}: {
  sessions: Array<{ id: number; title: string }>;
}) {
  const [sessionId, setSessionId] = useState<string>(
    sessions[0] ? String(sessions[0].id) : '',
  );
  const [overall, setOverall] = useState('5');
  const [instructor, setInstructor] = useState('5');
  const [content, setContent] = useState('5');
  const [pace, setPace] = useState('5');
  const [comments, setComments] = useState('');

  const { mutate: submitFeedback, isPending } = useApiMutation(
    () =>
      browserClient().POST('/feedback/', {
        body: {
          session_id: Number(sessionId),
          overall_rating: Number(overall),
          instructor_rating: Number(instructor),
          content_rating: Number(content),
          pace_rating: Number(pace),
          comments: comments || null,
        } as never,
      }),
    {
      successMessage: 'Feedback submitted',
      errorMessage: 'Failed to submit feedback.',
      onSuccess: () => setComments(''),
    },
  );

  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No sessions available to rate.</p>;
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitFeedback(undefined);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="session">Session</Label>
        <select
          id="session"
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <RatingInput label="Overall" value={overall} onChange={setOverall} />
        <RatingInput label="Instructor" value={instructor} onChange={setInstructor} />
        <RatingInput label="Content" value={content} onChange={setContent} />
        <RatingInput label="Pace" value={pace} onChange={setPace} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="comments">Comments (optional)</Label>
        <Textarea
          id="comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
          placeholder="What did you like, what could be improved?"
        />
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : null}
        Submit feedback
      </Button>
    </form>
  );
}

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
