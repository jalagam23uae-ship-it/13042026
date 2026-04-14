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

export function CreateAssignmentForm({
  courses,
}: {
  courses: Array<{ id: number; title: string }>;
}) {
  const [courseId, setCourseId] = useState<string>(
    courses[0] ? String(courses[0].id) : '',
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('100');

  const { mutate: create, isPending } = useApiMutation(
    () =>
      browserClient().POST('/assignments/', {
        body: {
          course_id: Number(courseId),
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          max_score: Number(maxScore) || 100,
        } as never,
      }),
    {
      errorMessage: 'Failed to create assignment.',
      onSuccess: () => {
        toast.success(`Assignment "${title}" created`);
        setTitle('');
        setDescription('');
        setDueDate('');
        setMaxScore('100');
      },
    },
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !courseId) {
      toast.error('Title and course are required');
      return;
    }
    create(undefined);
  }

  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create a course first before adding assignments.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-course">Course *</Label>
          <select
            id="a-course"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-title">Title *</Label>
          <Input
            id="a-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Week 1 Exercises"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="a-description">Description</Label>
        <Textarea
          id="a-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Instructions for students…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-due">Due date</Label>
          <Input
            id="a-due"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-max">Max score</Label>
          <Input
            id="a-max"
            type="number"
            min={1}
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
        Create assignment
      </Button>
    </form>
  );
}
