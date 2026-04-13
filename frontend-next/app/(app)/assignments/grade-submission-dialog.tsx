'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

type Submission = {
  id: number;
  student_name?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  comments?: string | null;
  score?: number | null;
  feedback?: string | null;
  max_score?: number | null;
};

export function GradeSubmissionDialog({
  submission,
  maxScore,
}: {
  submission: Submission;
  maxScore: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [score, setScore] = useState(String(submission.score ?? ''));
  const [feedback, setFeedback] = useState(submission.feedback ?? '');

  function submit() {
    const numScore = Number(score);
    if (Number.isNaN(numScore) || numScore < 0 || numScore > maxScore) {
      toast.error(`Score must be between 0 and ${maxScore}`);
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.PUT('/assignments/grade/{submission_id}', {
        params: { path: { submission_id: submission.id } },
        body: { score: numScore, feedback: feedback || null } as never,
      });
      if (error) {
        toast.error('Failed to grade.');
        return;
      }
      toast.success('Grade saved');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <CheckCircle2 />
            Grade
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grade submission</DialogTitle>
          <DialogDescription>
            {submission.student_name ?? `Student #${submission.id}`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {submission.file_url ? (
            <a
              href={`/api${submission.file_url.startsWith('/') ? '' : '/'}${submission.file_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-accent"
            >
              <ExternalLink className="size-4" />
              View {submission.file_name ?? 'submission'}
            </a>
          ) : null}
          {submission.comments ? (
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="text-[10px] uppercase text-muted-foreground">Student comments</div>
              <p className="mt-1 whitespace-pre-wrap">{submission.comments}</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="score">Score (0 – {maxScore})</Label>
            <Input
              id="score"
              type="number"
              min={0}
              max={maxScore}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="feedback">Feedback</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Feedback for the student…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !score}>
            {isPending ? <Loader2 className="animate-spin" /> : null}
            Save grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
