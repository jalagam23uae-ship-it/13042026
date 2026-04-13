'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function CreateTestForm({
  courses,
}: {
  courses: Array<{ id: number; title: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [passMark, setPassMark] = useState(60);
  const [durationMin, setDurationMin] = useState(30);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { data, error } = await client.POST('/tests/', {
        body: {
          title: title.trim(),
          course_id: courseId ? Number(courseId) : null,
          pass_mark: passMark,
          duration_min: durationMin,
          questions: [],
        } as never,
      });
      if (error || !data) {
        toast.error('Failed to create test.');
        return;
      }
      toast.success('Test created — add questions next.');
      const createdId = (data as { id?: number }).id;
      if (createdId) {
        router.push(`/tests/${createdId}/edit`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="t-title">Title *</Label>
        <Input
          id="t-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label htmlFor="t-course">Course</Label>
        <select
          id="t-course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">— none —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="t-pass">Pass mark (%)</Label>
        <Input
          id="t-pass"
          type="number"
          min={0}
          max={100}
          value={passMark}
          onChange={(e) => setPassMark(Number(e.target.value) || 0)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="t-duration">Duration (min)</Label>
        <Input
          id="t-duration"
          type="number"
          min={1}
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value) || 0)}
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />}
          Create test
        </Button>
      </div>
    </form>
  );
}
