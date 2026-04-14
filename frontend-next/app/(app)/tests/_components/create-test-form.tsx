'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

export function CreateTestForm({
  courses,
}: {
  courses: Array<{ id: number; title: string }>;
}) {
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [passMark, setPassMark] = useState('60');
  const [durationMin, setDurationMin] = useState('30');

  const { mutate: create, isPending } = useApiMutation(
    () =>
      browserClient().POST('/tests/', {
        body: {
          title: title.trim(),
          course_id: courseId ? Number(courseId) : null,
          pass_mark: Number(passMark) || 60,
          duration_min: Number(durationMin) || 30,
          questions: [],
        } as never,
      }),
    {
      errorMessage: 'Failed to create test.',
      onSuccess: () => {
        toast.success(`Test "${title}" created — add questions next.`);
        setTitle('');
        setCourseId('');
        setPassMark('60');
        setDurationMin('30');
      },
    },
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    create(undefined);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="t-title">Title *</Label>
          <Input
            id="t-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Python Basics Quiz"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="t-course">Course</Label>
          <select
            id="t-course"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">— none —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="t-pass">Pass mark (%)</Label>
          <Input
            id="t-pass"
            type="number"
            min={0}
            max={100}
            value={passMark}
            onChange={(e) => setPassMark(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="t-dur">Duration (min)</Label>
          <Input
            id="t-dur"
            type="number"
            min={1}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
        Create test
      </Button>
      <p className="text-xs text-muted-foreground">
        The test is created empty. Question editor coming in a later phase.
      </p>
    </form>
  );
}
