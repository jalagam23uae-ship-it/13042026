'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  ArrowRight,
  CheckCircle2,
  Loader2,
  GraduationCap,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { browserClient } from '@/lib/api/client';

type Enrollment = {
  course_id?: number;
  course_title?: string | null;
  category?: string | null;
  progress_pct?: number | null;
  completed?: boolean | null;
  total_lessons?: number | null;
  completed_lessons?: number | null;
};

export function MyCourseDialog() {
  const [open, setOpen] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  function load() {
    startTransition(async () => {
      const client = browserClient();
      const { data } = await (client as ReturnType<typeof browserClient>).GET(
        '/enrollments/my' as never,
        {} as never,
      );
      setEnrollments(Array.isArray(data) ? (data as Enrollment[]) : []);
    });
  }

  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      const matchesQuery = !query.trim() ||
        (e.course_title ?? '').toLowerCase().includes(query.toLowerCase()) ||
        (e.category ?? '').toLowerCase().includes(query.toLowerCase());
      const matchesFilter =
        filter === 'all' ||
        (filter === 'completed' && e.completed) ||
        (filter === 'active' && !e.completed);
      return matchesQuery && matchesFilter;
    });
  }, [enrollments, query, filter]);

  const activeCount = enrollments.filter((e) => !e.completed).length;
  const completedCount = enrollments.filter((e) => e.completed).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) { setQuery(''); setFilter('all'); load(); }
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <GraduationCap className="size-4" />
            My Courses
          </Button>
        }
      />

      <DialogContent className="flex flex-col gap-0 p-0 max-w-xl max-h-[85vh]">
        {/* ── Header ─────────────────────────────── */}
        <DialogHeader className="shrink-0 px-5 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <GraduationCap className="size-4 text-primary" />
            </div>
            My Courses
          </DialogTitle>

          {/* Stats row */}
          {!isPending && enrollments.length > 0 && (
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent',
                )}
              >
                All
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  filter === 'all' ? 'bg-white/20' : 'bg-background',
                )}>
                  {enrollments.length}
                </span>
              </button>
              <button
                onClick={() => setFilter('active')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  filter === 'active'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent',
                )}
              >
                <Clock className="size-3" />
                In Progress
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  filter === 'active' ? 'bg-white/20' : 'bg-background',
                )}>
                  {activeCount}
                </span>
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  filter === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent',
                )}
              >
                <CheckCircle2 className="size-3" />
                Completed
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  filter === 'completed' ? 'bg-white/20' : 'bg-background',
                )}>
                  {completedCount}
                </span>
              </button>
            </div>
          )}

          {/* Search */}
          <div className="mt-3 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search courses…"
              className="pl-8 h-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </DialogHeader>

        {/* ── Body ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2">
          {isPending ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loading courses…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                <BookOpen className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {query
                    ? 'No courses match your search'
                    : filter !== 'all'
                      ? `No ${filter} courses`
                      : 'No enrolled courses yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {!query && filter === 'all' && 'Browse the catalog to get started.'}
                </p>
              </div>
            </div>
          ) : (
            filtered.map((enrollment) => {
              const pct = Math.round(Number(enrollment.progress_pct ?? 0));
              const lessonsTotal = enrollment.total_lessons ?? 0;
              const lessonsDone = enrollment.completed_lessons ?? 0;
              return (
                <Link
                  key={enrollment.course_id}
                  href={`/courses/${enrollment.course_id}`}
                  onClick={() => setOpen(false)}
                  className="group flex items-start gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-accent transition-colors"
                >
                  {/* Icon */}
                  <div className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl mt-0.5',
                    enrollment.completed
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-primary/10',
                  )}>
                    {enrollment.completed
                      ? <CheckCircle2 className="size-5 text-emerald-600" />
                      : <BookOpen className="size-5 text-primary" />
                    }
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug truncate">
                        {enrollment.course_title ?? 'Untitled'}
                      </p>
                      <Badge
                        variant={enrollment.completed ? 'secondary' : 'outline'}
                        className={cn(
                          'shrink-0 text-[10px]',
                          enrollment.completed && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                        )}
                      >
                        {enrollment.completed ? '✓ Done' : `${pct}%`}
                      </Badge>
                    </div>

                    {enrollment.category ? (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {enrollment.category}
                      </p>
                    ) : null}

                    {!enrollment.completed && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                        {lessonsTotal > 0 && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {lessonsDone} / {lessonsTotal} lessons complete
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <ArrowRight className="size-4 text-muted-foreground/50 shrink-0 mt-1 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5" />
                </Link>
              );
            })
          )}
        </div>

        {/* ── Footer ─────────────────────────────── */}
        {!isPending && enrollments.length > 0 && (
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              {filtered.length !== enrollments.length
                ? `Showing ${filtered.length} of ${enrollments.length} courses`
                : `${enrollments.length} course${enrollments.length !== 1 ? 's' : ''} enrolled`}
            </p>
            <Link
              href="/courses"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
