'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type Day = {
  date: string;
  present?: boolean;
  login_minutes?: number | null;
  course_minutes?: number | null;
};

/**
 * 30-day GitHub-style heatmap for daily learning activity.
 * Each cell is colored by total minutes (login + course).
 */
export function AttendanceHeatmap({ days }: { days: Day[] }) {
  const dayMap = useMemo(() => {
    const map = new Map<string, Day>();
    for (const d of days) {
      map.set(d.date.slice(0, 10), d);
    }
    return map;
  }, [days]);

  // Generate the last 30 days
  const cells = useMemo(() => {
    const result: Array<{ key: string; date: Date; data: Day | undefined }> = [];
    const now = new Date();
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ key, date: d, data: dayMap.get(key) });
    }
    return result;
  }, [dayMap]);

  function intensity(d: Day | undefined): string {
    if (!d || !d.present) return 'bg-muted';
    const total = Number(d.login_minutes ?? 0) + Number(d.course_minutes ?? 0);
    if (total >= 120) return 'bg-primary';
    if (total >= 60) return 'bg-primary/70';
    if (total >= 30) return 'bg-primary/50';
    if (total >= 10) return 'bg-primary/30';
    return 'bg-primary/15';
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {cells.map((cell) => {
          const label =
            cell.data && cell.data.present
              ? `${cell.key} · login ${cell.data.login_minutes ?? 0}m · course ${cell.data.course_minutes ?? 0}m`
              : `${cell.key} · no activity`;
          return (
            <div
              key={cell.key}
              title={label}
              className={cn(
                'size-5 rounded-sm border border-border/50',
                intensity(cell.data),
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="size-3 rounded-sm bg-muted" />
        <div className="size-3 rounded-sm bg-primary/15" />
        <div className="size-3 rounded-sm bg-primary/30" />
        <div className="size-3 rounded-sm bg-primary/50" />
        <div className="size-3 rounded-sm bg-primary/70" />
        <div className="size-3 rounded-sm bg-primary" />
        <span>More</span>
      </div>
    </div>
  );
}
