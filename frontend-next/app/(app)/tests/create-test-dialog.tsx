'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function CreateTestDialog({
  courses,
}: {
  courses: Array<{ id: number; title: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [passMark, setPassMark] = useState('60');
  const [durationMin, setDurationMin] = useState('30');

  function reset() {
    setTitle(''); setCourseId(''); setPassMark('60'); setDurationMin('30');
  }

  function submit() {
    if (!title.trim()) { toast.error('Title is required'); return; }
    startTransition(async () => {
      const client = browserClient();
      const { data, error } = await client.POST('/tests/', {
        body: {
          title: title.trim(),
          course_id: courseId ? Number(courseId) : null,
          pass_mark: Number(passMark) || 60,
          duration_min: Number(durationMin) || 30,
          questions: [],
        } as never,
      });
      if (error) { toast.error('Failed to create test.'); return; }
      const newTest = data as { id: number; title: string } | undefined;
      toast.success(`Test "${title}" created — add questions now.`);
      reset();
      setOpen(false);
      // Go straight to the question editor so admin can add questions immediately
      if (newTest?.id) {
        router.push(`/tests/${newTest.id}/edit`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={
        <Button size="sm">
          <Plus className="size-3.5" />
          New test
        </Button>
      } />

      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-lg max-h-[90vh]">
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="size-4 text-primary" />
            </div>
            New test
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ct-title">Title *</Label>
              <Input id="ct-title" value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Python Basics Quiz" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ct-course">Course</Label>
              <select id="ct-course"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">— none —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ct-pass">Pass mark (%)</Label>
              <Input id="ct-pass" type="number" min={0} max={100}
                value={passMark} onChange={(e) => setPassMark(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ct-dur">Duration (min)</Label>
              <Input id="ct-dur" type="number" min={1}
                value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            After clicking <strong>Create test</strong> you will be taken directly to the question editor to add questions and answers.
          </p>
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Create test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
