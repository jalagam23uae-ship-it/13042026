'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type User = { id: number; name: string; email: string; role: string };
type Course = { id: number; title: string };

export function EnrollmentsClient({
  users,
  courses,
}: {
  users: User[];
  courses: Course[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [courseId, setCourseId] = useState<string>(courses[0]?.id.toString() ?? '');

  const students = users.filter((u) => u.role === 'student');
  const filtered = students.filter((u) =>
    search.trim()
      ? u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkEnroll() {
    if (!courseId) {
      toast.error('Select a course.');
      return;
    }
    if (selected.size === 0) {
      toast.error('Select at least one student.');
      return;
    }
    startTransition(async () => {
      // The backend currently only exposes POST /enrollments/ which enrolls
      // the authenticated caller in a course. There is no admin-side
      // "enroll on behalf of another user" endpoint, so this bulk action
      // cannot be completed until that endpoint is added.
      toast.error(
        'Bulk-enroll requires a backend admin endpoint that does not yet exist. Please add POST /enrollments/admin/ on the backend.',
      );
      router.refresh();
      setSelected(new Set());
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bulk enroll students</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="e-search">Search students</Label>
            <Input
              id="e-search"
              placeholder="Name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="e-course">Course</Label>
            <select
              id="e-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
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
          <Button onClick={bulkEnroll} disabled={pending || selected.size === 0}>
            {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
            Enroll ({selected.size})
          </Button>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-md border">
          <ul className="divide-y text-sm">
            {filtered.slice(0, 200).map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-3 py-1.5">
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => toggle(u.id)}
                  className="size-4"
                />
                <span className="flex-1 font-medium">{u.name}</span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                No students match.
              </li>
            ) : null}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
