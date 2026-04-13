'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, ArrowUp, ArrowDown, X } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type Course = { id: number; title: string };

export function PathBuilder({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<number[]>([]);

  const available = courses.filter((c) => !selected.includes(c.id));
  const selectedCourses = selected
    .map((id) => courses.find((c) => c.id === id))
    .filter(Boolean) as Course[];

  function add(id: number) {
    setSelected((prev) => [...prev, id]);
  }
  function removeId(id: number) {
    setSelected((prev) => prev.filter((n) => n !== id));
  }
  function move(id: number, dir: -1 | 1) {
    setSelected((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (selected.length === 0) {
      toast.error('Add at least one course.');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/learning-paths/', {
        body: {
          title: title.trim(),
          description: description.trim() || null,
          course_ids: selected,
        } as never,
      });
      if (error) {
        toast.error('Failed to create learning path.');
        return;
      }
      toast.success('Learning path created');
      setTitle('');
      setDescription('');
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="lp-title">Title *</Label>
          <Input
            id="lp-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lp-desc">Description</Label>
          <Input
            id="lp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Available courses</Label>
          <div className="max-h-48 overflow-y-auto rounded-md border">
            <ul className="divide-y text-sm">
              {available.length === 0 ? (
                <li className="px-3 py-2 text-muted-foreground">None</li>
              ) : (
                available.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5"
                  >
                    <span className="truncate">{c.title}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => add(c.id)}>
                      <Plus className="size-3.5" />
                      Add
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Path order</Label>
          <div className="max-h-48 overflow-y-auto rounded-md border">
            <ol className="divide-y text-sm">
              {selectedCourses.length === 0 ? (
                <li className="px-3 py-2 text-muted-foreground">No courses yet</li>
              ) : (
                selectedCourses.map((c, idx) => (
                  <li key={c.id} className="flex items-center gap-2 px-3 py-1.5">
                    <span className="size-5 rounded-full bg-muted text-center text-xs leading-5">
                      {idx + 1}
                    </span>
                    <span className="flex-1 truncate">{c.title}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => move(c.id, -1)}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => move(c.id, 1)}
                      disabled={idx === selectedCourses.length - 1}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeId(c.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                ))
              )}
            </ol>
          </div>
        </div>
      </div>

      <Textarea className="hidden" tabIndex={-1} aria-hidden readOnly value="" />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        Create path
      </Button>
    </form>
  );
}
