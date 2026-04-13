'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Loader2, ClipboardCheck } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AssignmentForm } from './assignment-form';

type AssignmentRow = {
  id: number;
  course_id: number;
  course_title?: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  max_score: number;
  is_active: boolean;
};

type Submission = {
  id: number;
  user_id: number;
  student_name?: string;
  file_url?: string | null;
  comments?: string | null;
  submitted_at?: string | null;
  graded?: boolean;
  score?: number | null;
  feedback?: string | null;
};

export function AssignmentRowActions({
  assignment,
  courses,
}: {
  assignment: AssignmentRow;
  courses: Array<{ id: number; title: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  async function openGrade() {
    setGradeOpen(true);
    const client = browserClient();
    const { data } = await client.GET('/assignments/submissions/{assignment_id}', {
      params: { path: { assignment_id: assignment.id } },
    });
    setSubmissions((Array.isArray(data) ? data : []) as Submission[]);
  }

  function remove() {
    if (!confirm(`Delete assignment "${assignment.title}"?`)) return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/assignments/{assignment_id}', {
        params: { path: { assignment_id: assignment.id } },
      });
      if (error) {
        toast.error('Failed to delete assignment.');
        return;
      }
      toast.success('Assignment deleted');
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Button size="icon" variant="ghost" title="Grade submissions" onClick={openGrade}>
        <ClipboardCheck className="size-4" />
      </Button>

      <Dialog open={gradeOpen} onOpenChange={setGradeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submissions — {assignment.title}</DialogTitle>
            <DialogDescription>
              Grade student submissions. Max score: {assignment.max_score}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {submissions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No submissions yet.
              </p>
            ) : (
              submissions.map((s) => (
                <GradeRow
                  key={s.id}
                  submission={s}
                  maxScore={assignment.max_score}
                  onGraded={(updated) =>
                    setSubmissions((prev) =>
                      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
                    )
                  }
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger
          render={
            <Button size="icon" variant="ghost">
              <Pencil className="size-4" />
            </Button>
          }
        />
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit assignment</DialogTitle>
            <DialogDescription>Update the assignment details.</DialogDescription>
          </DialogHeader>
          <AssignmentForm
            mode="edit"
            courses={courses}
            initial={{
              id: assignment.id,
              course_id: assignment.course_id,
              title: assignment.title,
              description: assignment.description ?? '',
              due_date: assignment.due_date ?? '',
              max_score: assignment.max_score,
              is_active: assignment.is_active,
            }}
            onSaved={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Button size="icon" variant="ghost" onClick={remove} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </Button>
    </div>
  );
}

function GradeRow({
  submission,
  maxScore,
  onGraded,
}: {
  submission: Submission;
  maxScore: number;
  onGraded: (updated: Submission) => void;
}) {
  const [score, setScore] = useState<number>(submission.score ?? 0);
  const [feedback, setFeedback] = useState<string>(submission.feedback ?? '');
  const [pending, startTransition] = useTransition();

  function save() {
    if (score < 0 || score > maxScore) {
      toast.error(`Score must be between 0 and ${maxScore}.`);
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { data, error } = await client.PUT('/assignments/grade/{submission_id}', {
        params: { path: { submission_id: submission.id } },
        body: { score, feedback: feedback.trim() || null },
      });
      if (error || !data) {
        toast.error('Failed to grade submission.');
        return;
      }
      toast.success('Graded');
      onGraded(data as Submission);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{submission.student_name ?? 'Unknown'}</span>
        {submission.graded ? (
          <span className="text-xs text-green-600">Graded</span>
        ) : (
          <span className="text-xs text-muted-foreground">Pending</span>
        )}
      </div>
      {submission.file_url ? (
        <a
          href={submission.file_url}
          target="_blank"
          rel="noreferrer"
          className="text-xs underline"
        >
          Download submission
        </a>
      ) : null}
      {submission.comments ? (
        <p className="text-xs text-muted-foreground">Student notes: {submission.comments}</p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`score-${submission.id}`}>Score</Label>
          <Input
            id={`score-${submission.id}`}
            type="number"
            min={0}
            max={maxScore}
            value={score}
            onChange={(e) => setScore(Number(e.target.value) || 0)}
            className="w-24"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`fb-${submission.id}`}>Feedback</Label>
          <Textarea
            id={`fb-${submission.id}`}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
          />
        </div>
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save grade
        </Button>
      </div>
    </div>
  );
}
