'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type CalendarEvent = {
  id: string | number;
  title: string;
  type?: string | null;
  start?: string | null;
  end?: string | null;
};

const TYPE_COLOR: Record<string, string> = {
  session: 'bg-blue-500',
  assignment: 'bg-amber-500',
  test: 'bg-purple-500',
  deadline: 'bg-red-500',
};

export function CalendarGrid({ events }: { events: CalendarEvent[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [view, setView] = useState<'month' | 'list'>('month');

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const { days, eventsByDate } = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startOffset = first.getDay();
    const totalDays = last.getDate();
    const grid: Array<{ date: Date | null; key: string }> = [];

    for (let i = 0; i < startOffset; i++) {
      grid.push({ date: null, key: `pad-${i}` });
    }
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d);
      grid.push({ date, key: `d-${d}` });
    }
    while (grid.length % 7 !== 0) {
      grid.push({ date: null, key: `pad-end-${grid.length}` });
    }

    const byDate = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      if (!e.start) return;
      const d = new Date(e.start);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const key = d.toISOString().slice(0, 10);
      const arr = byDate.get(key) ?? [];
      arr.push(e);
      byDate.set(key, arr);
    });

    return { days: grid, eventsByDate: byDate };
  }, [events, year, month]);

  function prevMonth() {
    setCursor(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCursor(new Date(year, month + 1, 1));
  }
  function today() {
    const d = new Date();
    setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={today}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="size-3.5" />
            </Button>
            <h2 className="ml-2 text-base font-semibold">{monthLabel}</h2>
          </div>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setView('month')}
              className={cn(
                'rounded px-2 py-1 text-xs transition-colors',
                view === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'rounded px-2 py-1 text-xs transition-colors',
                view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              List
            </button>
          </div>
        </div>

        {view === 'month' ? (
          <>
            <div className="grid grid-cols-7 gap-px rounded-md border bg-border text-xs">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div
                  key={d}
                  className="bg-muted/50 p-2 text-center font-medium text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {days.map((cell) => {
                const key = cell.date?.toISOString().slice(0, 10);
                const dayEvents = key ? (eventsByDate.get(key) ?? []) : [];
                const isToday = key === todayKey;
                return (
                  <div
                    key={cell.key}
                    className={cn(
                      'min-h-24 bg-background p-1.5',
                      !cell.date && 'bg-muted/20',
                      isToday && 'bg-primary/5',
                    )}
                  >
                    {cell.date ? (
                      <>
                        <div
                          className={cn(
                            'mb-1 text-right text-[11px] font-medium',
                            isToday ? 'text-primary' : 'text-muted-foreground',
                          )}
                        >
                          {cell.date.getDate()}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {dayEvents.slice(0, 3).map((e) => (
                            <div
                              key={e.id}
                              className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] hover:bg-accent"
                              title={e.title}
                            >
                              <span
                                className={cn(
                                  'size-1.5 shrink-0 rounded-full',
                                  TYPE_COLOR[e.type ?? ''] ?? 'bg-muted-foreground',
                                )}
                              />
                              <span className="truncate">{e.title}</span>
                            </div>
                          ))}
                          {dayEvents.length > 3 ? (
                            <div className="text-[9px] text-muted-foreground">
                              +{dayEvents.length - 3} more
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
              {Object.entries(TYPE_COLOR).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <span className={cn('size-2 rounded-full', color)} />
                  <span className="capitalize">{type}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events.</p>
            ) : (
              events
                .filter((e) => e.start)
                .sort((a, b) => new Date(a.start ?? 0).getTime() - new Date(b.start ?? 0).getTime())
                .map((e) => (
                  <div
                    key={e.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{e.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.start ? new Date(e.start).toLocaleString() : ''}
                      </div>
                    </div>
                    {e.type ? (
                      <Badge variant="outline" className="capitalize">
                        {e.type}
                      </Badge>
                    ) : null}
                  </div>
                ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
