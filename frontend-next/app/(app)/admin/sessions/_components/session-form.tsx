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

export type SessionFormValues = {
  id?: number;
  title: string;
  description: string;
  instructor: string;
  course_id: number | null;
  start_time: string;
  end_time: string;
  status: string;
};

const EMPTY: SessionFormValues = {
  title: '',
  description: '',
  instructor: '',
  course_id: null,
  start_time: '',
  end_time: '',
  status: 'scheduled',
};

export function SessionForm({
  courses,
  initial,
  mode = 'create',
  onSaved,
}: {
  courses: Array<{ id: number; title: string }>;
  initial?: SessionFormValues;
  mode?: 'create' | 'edit';
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<SessionFormValues>(initial ?? EMPTY);

  function set<K extends keyof SessionFormValues>(key: K, v: SessionFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim() || !values.start_time || !values.end_time) {
      toast.error('Title, start time, and end time are required.');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const body = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        instructor: values.instructor.trim() || null,
        course_id: values.course_id,
        start_time: new Date(values.start_time).toISOString(),
        end_time: new Date(values.end_time).toISOString(),
        status: values.status || 'scheduled',
      };
      if (mode === 'edit' && values.id != null) {
        const { error } = await client.PUT('/sessions/{session_id}', {
          params: { path: { session_id: values.id } },
          body,
        });
        if (error) {
          toast.error('Failed to update session.');
          return;
        }
        toast.success('Session updated');
      } else {
        const { error } = await client.POST('/sessions/', { body });
        if (error) {
          toast.error('Failed to create session.');
          return;
        }
        toast.success('Session created');
        setValues(EMPTY);
      }
      onSaved?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-title">Title *</Label>
          <Input
            id="s-title"
            value={values.title}
            onChange={(e) => set('title', e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-instructor">Instructor</Label>
          <Input
            id="s-instructor"
            value={values.instructor}
            onChange={(e) => set('instructor', e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="s-description">Description</Label>
        <Textarea
          id="s-description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-start">Start *</Label>
          <Input
            id="s-start"
            type="datetime-local"
            value={values.start_time ? toDateTimeLocal(values.start_time) : ''}
            onChange={(e) => set('start_time', e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-end">End *</Label>
          <Input
            id="s-end"
            type="datetime-local"
            value={values.end_time ? toDateTimeLocal(values.end_time) : ''}
            onChange={(e) => set('end_time', e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="s-status">Status</Label>
          <select
            id="s-status"
            value={values.status}
            onChange={(e) => set('status', e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="scheduled">Scheduled</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="s-course">Course (optional)</Label>
        <select
          id="s-course"
          value={values.course_id ?? ''}
          onChange={(e) =>
            set('course_id', e.target.value ? Number(e.target.value) : null)
          }
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

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? <Loader2 className="animate-spin" /> : mode === 'edit' ? <Save /> : <Plus />}
        {mode === 'edit' ? 'Save changes' : 'Create session'}
      </Button>
    </form>
  );
}

function toDateTimeLocal(iso: string): string {
  // Convert ISO string to the local datetime-local input format (YYYY-MM-DDTHH:mm)
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
