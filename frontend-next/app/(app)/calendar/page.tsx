import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon } from 'lucide-react';
import { CalendarGrid } from './calendar-grid';

type CalendarEvent = {
  id: string | number;
  title: string;
  type?: string | null;
  start?: string | null;
  end?: string | null;
  course_id?: number | null;
};

function fmtDate(dt?: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function fmtTime(dt?: string | null) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TYPE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  session: 'default',
  assignment: 'secondary',
  test: 'outline',
  deadline: 'destructive',
};

export default async function CalendarPage() {
  await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/calendar/events', {});
  const events = (Array.isArray(data) ? data : []) as CalendarEvent[];

  const now = Date.now();
  const upcoming = events
    .filter((event) => !event.start || new Date(event.start).getTime() >= now)
    .sort((a, b) => new Date(a.start ?? 0).getTime() - new Date(b.start ?? 0).getTime());
  const past = events
    .filter((event) => event.start && new Date(event.start).getTime() < now)
    .sort((a, b) => new Date(b.start ?? 0).getTime() - new Date(a.start ?? 0).getTime());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Sessions, assignments, and deadlines for your enrolled courses.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load calendar.
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nothing on your calendar yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <CalendarGrid events={events} />
          <div className="grid gap-6 lg:grid-cols-2">
            <EventColumn title="Upcoming" events={upcoming} empty="No upcoming events." />
            <EventColumn title="Past" events={past} empty="No past events." />
          </div>
        </>
      )}
    </div>
  );
}

function EventColumn({
  title,
  events,
  empty,
}: {
  title: string;
  events: CalendarEvent[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarIcon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{event.title}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtDate(event.start)}
                  {event.start ? ` · ${fmtTime(event.start)}` : ''}
                </div>
              </div>
              {event.type ? (
                <Badge variant={TYPE_VARIANT[event.type] ?? 'outline'} className="capitalize">
                  {event.type}
                </Badge>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
