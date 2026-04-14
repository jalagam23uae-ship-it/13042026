'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, Loader2, LogOut, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function CheckInButton({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function checkin() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/attendance/checkin', {
        body: { session_id: sessionId } as never,
      });
      if (error) {
        toast.error('Failed to check in.');
        return;
      }
      toast.success('Checked in');
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={checkin} disabled={isPending}>
      {isPending ? <Loader2 className="animate-spin" /> : <CheckSquare />}
      Check in
    </Button>
  );
}

export function CheckOutButton({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function checkout() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/attendance/checkout', {
        body: { session_id: sessionId } as never,
      });
      if (error) {
        toast.error('Failed to check out.');
        return;
      }
      toast.success('Checked out');
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant="outline" onClick={checkout} disabled={isPending}>
      {isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
      Check out
    </Button>
  );
}

type SessionLite = {
  id: number;
  title?: string | null;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  max_attendees?: number | null;
};

function toLocalDateTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOff).toISOString().slice(0, 16);
}

export function EditSessionButton({ session }: { session: SessionLite }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(session.title ?? '');
  const [description, setDescription] = useState(session.description ?? '');
  const [startTime, setStartTime] = useState(toLocalDateTime(session.start_time));
  const [endTime, setEndTime] = useState(toLocalDateTime(session.end_time));
  const [location, setLocation] = useState(session.location ?? '');
  const [maxAttendees, setMaxAttendees] = useState(
    session.max_attendees != null ? String(session.max_attendees) : '',
  );

  function save() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.PUT('/sessions/{session_id}' as never, {
        params: { path: { session_id: session.id } },
        body: {
          title,
          description: description || null,
          start_time: startTime ? new Date(startTime).toISOString() : null,
          end_time: endTime ? new Date(endTime).toISOString() : null,
          location: location || null,
          max_attendees: maxAttendees ? Number(maxAttendees) : null,
        } as never,
      } as never);
      if (error) {
        toast.error('Failed to update session');
        return;
      }
      toast.success('Session updated');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-6 px-2"
        aria-label="Edit session"
      >
        <Pencil className="size-3" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit session</DialogTitle>
            <DialogDescription>Update session details.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Start time</Label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>End time</Label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Location</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Online / Room number"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Max attendees</Label>
                <Input
                  type="number"
                  min="1"
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type AttendeeRecord = {
  user_id?: number | null;
  user_name?: string | null;
  user_email?: string | null;
  checkin_time?: string | null;
  checkout_time?: string | null;
  duration_minutes?: number | null;
};

export function AttendeesButton({ sessionId, title }: { sessionId: number; title: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);

  async function load() {
    setLoading(true);
    const client = browserClient();
    const { data } = await client.GET('/sessions/{session_id}/attendees' as never, {
      params: { path: { session_id: sessionId } },
    } as never);
    setAttendees((Array.isArray(data) ? data : []) as AttendeeRecord[]);
    setLoading(false);
  }

  function openDialog() {
    setOpen(true);
    load();
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={openDialog}
        className="h-6 px-2"
        aria-label="View attendees"
      >
        <Users className="size-3" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attendees · {title}</DialogTitle>
            <DialogDescription>
              {attendees.length} {attendees.length === 1 ? 'attendee' : 'attendees'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : attendees.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No attendees have checked in yet.
              </p>
            ) : (
              <ul className="divide-y">
                {attendees.map((a, idx) => (
                  <li key={`${a.user_id ?? idx}`} className="p-3 text-sm">
                    <div className="font-medium">{a.user_name ?? `User ${a.user_id}`}</div>
                    {a.user_email ? (
                      <div className="text-xs text-muted-foreground">{a.user_email}</div>
                    ) : null}
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                      {a.checkin_time ? (
                        <span>In: {new Date(a.checkin_time).toLocaleTimeString()}</span>
                      ) : null}
                      {a.checkout_time ? (
                        <span>Out: {new Date(a.checkout_time).toLocaleTimeString()}</span>
                      ) : null}
                      {a.duration_minutes != null ? (
                        <span>{a.duration_minutes} min</span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteSessionButton({
  sessionId,
  title,
}: {
  sessionId: number;
  title: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function del() {
    if (!window.confirm(`Delete session "${title}"?`)) return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/sessions/{session_id}', {
        params: { path: { session_id: sessionId } },
      });
      if (error) {
        toast.error('Failed to delete.');
        return;
      }
      toast.success('Session deleted');
      router.refresh();
    });
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={del}
      disabled={isPending}
      className="h-6 px-2 text-destructive hover:text-destructive"
    >
      {isPending ? <Loader2 className="animate-spin size-3" /> : <Trash2 className="size-3" />}
    </Button>
  );
}
