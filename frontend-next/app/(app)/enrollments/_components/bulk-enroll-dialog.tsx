'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap, Loader2, Search, Users, X, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { browserClient } from '@/lib/api/client';

type UserRow = { id: number; name?: string | null; email?: string | null; role?: string | null };
type CourseRow = { id: number; title: string };

export function BulkEnrollDialog({ courses }: { courses: CourseRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [courseId, setCourseId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  /* load users when dialog opens */
  useEffect(() => {
    if (!open) return;
    setLoadingUsers(true);
    const client = browserClient();
    (client as ReturnType<typeof browserClient>)
      .GET('/users/' as never, {} as never)
      .then(({ data }) => {
        const all = (Array.isArray(data) ? data : []) as UserRow[];
        setUsers(all.filter((u) => u.role === 'student' || u.role === 'Student'));
      })
      .finally(() => setLoadingUsers(false));
  }, [open]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  function toggle(id: number) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function selectAll() {
    const ids = filteredUsers.map((u) => u.id);
    setSelectedIds((prev) => {
      const set = new Set(prev);
      ids.forEach((id) => set.add(id));
      return Array.from(set);
    });
  }

  function reset() {
    setCourseId(''); setUserSearch(''); setSelectedIds([]);
  }

  function submit() {
    if (!courseId) { toast.error('Select a course first'); return; }
    if (selectedIds.length === 0) { toast.error('Select at least one student'); return; }
    startTransition(async () => {
      const client = browserClient();
      const { data, error } = await (client as ReturnType<typeof browserClient>).POST(
        '/enrollments/admin/bulk-enroll' as never,
        { body: { course_id: Number(courseId), user_ids: selectedIds } } as never,
      );
      if (error) { toast.error('Bulk enrollment failed.'); return; }
      const result = data as { enrolled: number; skipped: number };
      toast.success(
        `Enrolled ${result.enrolled} student${result.enrolled !== 1 ? 's' : ''}` +
        (result.skipped ? ` · ${result.skipped} already enrolled` : ''),
      );
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  const selectedCourse = courses.find((c) => String(c.id) === courseId);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={
        <Button size="sm" variant="outline" className="gap-1.5">
          <Users className="size-3.5" />
          Bulk enroll
        </Button>
      } />

      <DialogContent className="flex flex-col gap-0 p-0 sm:max-w-2xl max-h-[88vh]">
        {/* Header */}
        <DialogHeader className="shrink-0 px-6 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="size-4 text-primary" />
            </div>
            Bulk enroll students
          </DialogTitle>

          {/* Course selector */}
          <div className="mt-3 flex flex-col gap-1.5">
            <Label htmlFor="be-course">Course *</Label>
            <select id="be-course"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={courseId} onChange={(e) => { setCourseId(e.target.value); }}>
              <option value="">— select course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Selection summary */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
                <CheckCircle2 className="size-3" />
                {selectedIds.length} student{selectedIds.length !== 1 ? 's' : ''} selected
              </span>
              {selectedCourse && (
                <span className="text-xs text-muted-foreground">→ {selectedCourse.title}</span>
              )}
              <button type="button" onClick={() => setSelectedIds([])}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="size-3" /> Clear
              </button>
            </div>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 flex flex-col gap-3">
          {/* Search + Select all */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input placeholder="Search students by name or email…"
                className="pl-8 h-8"
                value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            </div>
            {filteredUsers.length > 0 && (
              <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={selectAll}>
                Select all ({filteredUsers.length})
              </Button>
            )}
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center gap-2 py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading students…</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {userSearch ? 'No students match your search.' : 'No students found.'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border divide-y overflow-hidden">
              {filteredUsers.map((u) => {
                const selected = selectedIds.includes(u.id);
                return (
                  <button key={u.id} type="button" onClick={() => toggle(u.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50',
                      selected && 'bg-primary/5',
                    )}>
                    {/* checkbox */}
                    <span className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                      selected ? 'bg-primary border-primary text-primary-foreground' : 'border-input',
                    )}>
                      {selected && (
                        <svg viewBox="0 0 12 12" className="size-2.5" fill="currentColor">
                          <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5"
                            strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{u.name ?? `User #${u.id}`}</div>
                      {u.email && (
                        <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                      )}
                    </div>
                    {selected && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] shrink-0">
                        Selected
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 px-6 py-3 border-t flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {loadingUsers ? '…' : `${users.length} student${users.length !== 1 ? 's' : ''} total`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={isPending || !courseId || selectedIds.length === 0}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <GraduationCap className="size-3.5" />}
              Enroll {selectedIds.length > 0 ? selectedIds.length : ''} student{selectedIds.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
