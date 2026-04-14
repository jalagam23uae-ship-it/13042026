'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

export function CreateSessionForm({
  courses,
}: {
  courses: Array<{ id: number; title: string }>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructor, setInstructor] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const { mutate: create, isPending } = useApiMutation(
    () =>
      browserClient().POST('/sessions/', {
        body: {
          title: title.trim(),
          description: description.trim() || null,
          instructor: instructor.trim() || null,
          course_id: courseId ? Number(courseId) : null,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          status: 'scheduled',
        } as never,
      }),
    {
      errorMessage: 'Failed to create session.',
      onSuccess: () => {
        toast.success(`Session "${title}" created`);
        setTitle('');
        setDescription('');
        setInstructor('');
        setCourseId('');
        setStartTime('');
        setEndTime('');
      },
    },
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !startTime || !endTime) {
      toast.error('Title, start, and end are required');
      return;
    }
    create(undefined);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-title">Title *</Label>
          <Input
            id="s-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. React Hooks Workshop"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-instructor">Instructor</Label>
          <Input
            id="s-instructor"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            placeholder="Name"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="s-course">Course (optional)</Label>
        <select
          id="s-course"
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="s-desc">Description</Label>
        <Textarea
          id="s-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-start">Start *</Label>
          <Input
            id="s-start"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-end">End *</Label>
          <Input
            id="s-end"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
        Create session
      </Button>
    </form>
  );
}
