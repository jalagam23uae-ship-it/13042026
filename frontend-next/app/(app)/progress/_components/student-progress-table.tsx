'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, CheckCircle2, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type CourseProgress = {
  course_id: number;
  course_title?: string | null;
  progress_pct?: number | null;
  completed?: boolean | null;
};

type StudentProgress = {
  user_id: number;
  name: string;
  email: string;
  courses: CourseProgress[];
  enrolled: number;
  completed: number;
  avgPct: number;
};

export function StudentProgressTable({ students }: { students: StudentProgress[] }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    if (!query.trim()) return students;
    const q = query.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    );
  }, [students, query]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by student name or email…"
          className="pl-8 h-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {query ? 'No students match your search.' : 'No student data yet.'}
        </p>
      ) : (
        <div className="rounded-lg border divide-y overflow-hidden">
          {filtered.map((s) => {
            const isOpen = expanded.has(s.user_id);
            const pctColor =
              s.avgPct >= 75 ? 'bg-emerald-500'
              : s.avgPct >= 40 ? 'bg-amber-500'
              : 'bg-red-400';

            return (
              <div key={s.user_id}>
                {/* Student row */}
                <button
                  type="button"
                  onClick={() => toggle(s.user_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                >
                  {/* Expand icon */}
                  <span className="shrink-0 text-muted-foreground">
                    {isOpen
                      ? <ChevronDown className="size-3.5" />
                      : <ChevronRight className="size-3.5" />}
                  </span>

                  {/* Avatar */}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {s.name.charAt(0).toUpperCase()}
                  </span>

                  {/* Name / email */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{s.email}</div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-6 shrink-0 text-xs text-muted-foreground">
                    <div className="text-center">
                      <div className="font-semibold text-foreground">{s.enrolled}</div>
                      <div>Enrolled</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-emerald-600">{s.completed}</div>
                      <div>Done</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="hidden md:flex items-center gap-2 w-32 shrink-0">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', pctColor)}
                        style={{ width: `${Math.min(100, s.avgPct)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right tabular-nums">
                      {s.avgPct}%
                    </span>
                  </div>

                  {/* Badge (mobile) */}
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px] md:hidden',
                      s.avgPct >= 75 && 'border-emerald-200 text-emerald-700',
                      s.avgPct < 40 && s.avgPct > 0 && 'border-red-200 text-red-600',
                    )}
                  >
                    {s.avgPct}%
                  </Badge>
                </button>

                {/* Expanded: per-course breakdown */}
                {isOpen && (
                  <div className="bg-muted/20 border-t px-4 py-3 flex flex-col gap-2.5">
                    {s.courses.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No course data available.</p>
                    ) : (
                      s.courses.map((c) => {
                        const pct = Math.round(Number(c.progress_pct ?? 0));
                        return (
                          <div key={c.course_id} className="flex items-center gap-3">
                            <div className={cn(
                              'flex size-6 shrink-0 items-center justify-center rounded-md',
                              c.completed ? 'bg-emerald-100' : 'bg-primary/10',
                            )}>
                              {c.completed
                                ? <CheckCircle2 className="size-3.5 text-emerald-600" />
                                : <BookOpen className="size-3.5 text-primary" />}
                            </div>
                            <span className="flex-1 min-w-0 text-xs font-medium truncate">
                              {c.course_title ?? `Course #${c.course_id}`}
                            </span>
                            <div className="flex items-center gap-2 w-32 shrink-0">
                              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full', c.completed ? 'bg-emerald-500' : 'bg-primary')}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-medium w-8 text-right tabular-nums text-muted-foreground">
                                {c.completed ? '100%' : `${pct}%`}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length !== students.length
          ? `Showing ${filtered.length} of ${students.length} students`
          : `${students.length} student${students.length !== 1 ? 's' : ''}`}
      </p>
    </div>
  );
}
