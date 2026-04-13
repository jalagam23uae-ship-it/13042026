'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Save } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export type AssignmentValues = {
  id?: number;
  course_id: number | null;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  is_active: boolean;
};

const EMPTY: AssignmentValues = {
  course_id: null,
  title: '',
  description: '',
  due_date: '',
  max_score: 100,
  is_active: true,
};

export function AssignmentForm({
  courses,
  initial,
  mode = 'create',
  onSaved,
}: {
  courses: Array<{ id: number; title: string }>;
  initial?: AssignmentValues;
  mode?: 'create' | 'edit';
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<AssignmentValues>(
    initial ?? { ...EMPTY, course_id: courses[0]?.id ?? null },
  );

  function set<K extends keyof AssignmentValues>(k: K, v: AssignmentValues[K]) {
    setValues((p) => ({ ...p, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim() || values.course_id == null) {
      toast.error('Title and course are required.');
      return;
    }
    const courseId = values.course_id;
    startTransition(async () => {
      const client = browserClient();
      if (mode === 'edit' && values.id != null) {
        const { error } = await client.PUT('/assignments/{assignment_id}', {
          params: { path: { assignment_id: values.id } },
          body: {
            title: values.title.trim(),
            description: values.description.trim() || null,
            due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
            max_score: values.max_score,
            is_active: values.is_active,
          },
        });
        if (error) {
          toast.error('Failed to update assignment.');
          return;
        }
        toast.success('Assignment updated');
      } else {
        const { error } = await client.POST('/assignments/', {
          body: {
            course_id: courseId,
            title: values.title.trim(),
            description: values.description.trim() || null,
            due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
            max_score: values.max_score,
          },
        });
        if (error) {
          toast.error('Failed to create assignment.');
          return;
        }
        toast.success('Assignment created');
        setValues({ ...EMPTY, course_id: courses[0]?.id ?? null });
      }
      onSaved?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-title">Title *</Label>
          <Input
            id="a-title"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-course">Course *</Label>
          <select
            id="a-course"
            value={values.course_id ?? ''}
            onChange={(e) =>
              set('course_id', e.target.value ? Number(e.target.value) : null)
            }
            disabled={mode === 'edit'}
            required
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— select —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="a-description">Description</Label>
        <Textarea
          id="a-description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-due">Due date</Label>
          <Input
            id="a-due"
            type="datetime-local"
            value={values.due_date ? toDateTimeLocal(values.due_date) : ''}
            onChange={(e) => set('due_date', e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="a-score">Max score</Label>
          <Input
            id="a-score"
            type="number"
            min={1}
            value={values.max_score}
            onChange={(e) => set('max_score', Number(e.target.value) || 0)}
          />
        </div>
        {mode === 'edit' ? (
          <div className="flex items-end gap-2">
            <input
              id="a-active"
              type="checkbox"
              className="size-4"
              checked={values.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
            />
            <Label htmlFor="a-active" className="cursor-pointer">
              Active
            </Label>
          </div>
        ) : null}
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? <Loader2 className="animate-spin" /> : mode === 'edit' ? <Save /> : <Plus />}
        {mode === 'edit' ? 'Save changes' : 'Create assignment'}
      </Button>
    </form>
  );
}

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
