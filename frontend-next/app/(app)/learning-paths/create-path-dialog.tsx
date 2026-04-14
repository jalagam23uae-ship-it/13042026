'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Plus, Route, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function CreatePathDialog({
  courses,
}: {
  courses: Array<{ id: number; title: string; category?: string | null }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [courseSearch, setCourseSearch] = useState('');

  function reset() {
    setTitle(''); setDescription(''); setSelectedIds([]); setCourseSearch('');
  }

  function toggleCourse(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const filteredCourses = courseSearch.trim()
    ? courses.filter(
        (c) =>
          c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
          (c.category ?? '').toLowerCase().includes(courseSearch.toLowerCase()),
      )
    : courses;

  function submit() {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (selectedIds.length === 0) { toast.error('Select at least one course'); return; }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/learning-paths/' as never, {
        body: {
          title: title.trim(),
          description: description.trim() || null,
          course_ids: selectedIds,
        } as never,
      } as never);
      if (error) { toast.error('Failed to create learning path.'); return; }
      toast.success(`Learning path "${title}" created`);
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus />
            New learning path
          </Button>
        }
      />

      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-2xl max-h-[88vh]">
        {/* header */}
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Route className="size-4 text-primary" />
            New learning path
          </DialogTitle>
          <DialogDescription>
            A curated sequence of courses to build a skill end-to-end.
          </DialogDescription>
        </DialogHeader>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lp-title">Title *</Label>
            <Input id="lp-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full Stack Web Development" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lp-desc">Description</Label>
            <Textarea id="lp-desc" value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder="What will students achieve by following this path?" />
          </div>

          {/* Course selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Courses *</Label>
              {selectedIds.length > 0 ? (
                <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
              ) : null}
            </div>

            {/* Selected course chips */}
            {selectedIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedIds.map((id) => {
                  const c = courses.find((x) => x.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      {c?.title ?? `Course ${id}`}
                      <button
                        type="button"
                        onClick={() => toggleCourse(id)}
                        className="ml-0.5 rounded hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            ) : null}

            {/* Course list with search */}
            <div className="rounded-lg border bg-muted/20 flex flex-col">
              <div className="relative border-b">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <input
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Filter courses…"
                  className="w-full bg-transparent py-2 pl-8 pr-3 text-sm outline-none"
                />
              </div>
              <div className="max-h-40 overflow-y-auto">
                {filteredCourses.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No courses found</p>
                ) : (
                  filteredCourses.map((c) => {
                    const selected = selectedIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCourse(c.id)}
                        className={[
                          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60',
                          selected ? 'bg-primary/8 text-primary' : '',
                        ].join(' ')}
                      >
                        <span className={[
                          'flex size-4 shrink-0 items-center justify-center rounded border',
                          selected ? 'bg-primary border-primary text-primary-foreground' : 'border-input',
                        ].join(' ')}>
                          {selected ? <Check className="size-2.5" /> : null}
                        </span>
                        <span className="flex-1 truncate">{c.title}</span>
                        {c.category ? (
                          <span className="text-xs text-muted-foreground">{c.category}</span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Courses will appear in the order selected above.
            </p>
          </div>
        </div>

        {/* footer */}
        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Create path
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
