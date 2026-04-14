'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings2,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Users,
  Award,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { browserClient } from '@/lib/api/client';

type Assignment = {
  id: number;
  title: string;
  description?: string | null;
  due_date?: string | null;
  max_score?: number | null;
  course_title?: string | null;
};

type Submission = {
  id: number;
  user_id: number;
  student_name?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  comments?: string | null;
  submitted_at?: string | null;
  score?: number | null;
  feedback?: string | null;
  graded?: boolean | null;
};

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Inline grade row ────────────────────────────────────────────── */
function GradeRow({
  sub,
  maxScore,
  onGraded,
}: {
  sub: Submission;
  maxScore: number;
  onGraded: (id: number, score: number, feedback: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState(String(sub.score ?? ''));
  const [feedback, setFeedback] = useState(sub.feedback ?? '');
  const [isPending, startTransition] = useTransition();

  function save() {
    const num = Number(score);
    if (Number.isNaN(num) || num < 0 || num > maxScore) {
      toast.error(`Score must be 0 – ${maxScore}`);
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await (client as ReturnType<typeof browserClient>).PUT(
        `/assignments/grade/${sub.id}` as never,
        { body: { score: num, feedback: feedback || null } } as never,
      );
      if (error) { toast.error('Failed to save grade.'); return; }
      toast.success('Grade saved');
      onGraded(sub.id, num, feedback);
      setEditing(false);
    });
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium text-sm">{sub.student_name ?? `Student #${sub.user_id}`}</div>
        <div className="text-[11px] text-muted-foreground">{fmt(sub.submitted_at)}</div>
      </TableCell>
      <TableCell>
        {sub.file_url ? (
          <a
            href={`/api${sub.file_url.startsWith('/') ? '' : '/'}${sub.file_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            {sub.file_name ?? 'View file'}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">No file</span>
        )}
        {sub.comments ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{sub.comments}</p>
        ) : null}
      </TableCell>
      <TableCell>
        {sub.graded ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">
            <CheckCircle2 className="size-3" /> Graded
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold">
            <Clock className="size-3" /> Pending
          </span>
        )}
      </TableCell>
      <TableCell>
        {editing ? (
          <div className="flex flex-col gap-2 min-w-[200px]">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={maxScore}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="h-7 w-20 text-xs"
                placeholder={`0–${maxScore}`}
              />
              <span className="text-xs text-muted-foreground">/ {maxScore}</span>
            </div>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Feedback (optional)"
              rows={2}
              className="text-xs"
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-6 text-xs" onClick={save} disabled={isPending || !score}>
                {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {sub.score != null ? (
              <span className="text-sm font-semibold">{sub.score}/{maxScore}</span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs gap-1"
              onClick={() => setEditing(true)}
            >
              <Award className="size-3" />
              {sub.graded ? 'Re-grade' : 'Grade'}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

/* ── Main dialog ─────────────────────────────────────────────────── */
export function ManageAssignmentDialog({ assignment }: { assignment: Assignment }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const maxScore = assignment.max_score ?? 100;

  async function loadSubmissions() {
    setLoading(true);
    const client = browserClient();
    const { data } = await (client as ReturnType<typeof browserClient>).GET(
      `/assignments/submissions/${assignment.id}` as never,
      {} as never,
    );
    setSubmissions(Array.isArray(data) ? (data as Submission[]) : []);
    setLoading(false);
  }

  function handleGraded(id: number, score: number, feedback: string) {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, score, feedback, graded: true } : s)),
    );
    router.refresh();
  }

  const gradedCount = submissions.filter((s) => s.graded).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) loadSubmissions();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-1.5">
            <Settings2 className="size-3.5" />
            Manage
          </Button>
        }
      />

      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-3xl max-h-[88vh]">
        {/* Header */}
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="size-4 text-primary" />
            </div>
            {assignment.title}
          </DialogTitle>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {assignment.course_title && (
              <Badge variant="secondary" className="text-xs">{assignment.course_title}</Badge>
            )}
            {assignment.due_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" /> Due {fmt(assignment.due_date)}
              </span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Award className="size-3" /> Max score: {maxScore}
            </span>
          </div>

          {/* Stats strip */}
          {!loading && submissions.length > 0 && (
            <div className="flex gap-3 mt-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
                <Users className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">{submissions.length} submitted</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">{gradedCount} graded</span>
              </div>
              {submissions.length - gradedCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5">
                  <Clock className="size-3.5 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">
                    {submissions.length - gradedCount} pending
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading submissions…</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Submission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score / Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <GradeRow
                    key={sub.id}
                    sub={sub}
                    maxScore={maxScore}
                    onGraded={handleGraded}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {loading ? 'Loading…' : `${submissions.length} total submission${submissions.length !== 1 ? 's' : ''}`}
          </p>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
