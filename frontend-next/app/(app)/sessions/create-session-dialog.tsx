'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Loader2, MapPin, Plus, User } from 'lucide-react';
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
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function CreateSessionDialog({
  courses,
}: {
  courses: Array<{ id: number; title: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructor, setInstructor] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [location, setLocation] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  function reset() {
    setTitle(''); setDescription(''); setInstructor('');
    setCourseId(''); setLocation(''); setMaxAttendees('');
    setStartTime(''); setEndTime('');
  }

  function submit() {
    if (!title.trim() || !startTime || !endTime) {
      toast.error('Title, start time, and end time are required');
      return;
    }
    if (new Date(endTime) <= new Date(startTime)) {
      toast.error('End time must be after start time');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/sessions/', {
        body: {
          title: title.trim(),
          description: description.trim() || null,
          instructor: instructor.trim() || null,
          course_id: courseId ? Number(courseId) : null,
          location: location.trim() || null,
          max_attendees: maxAttendees ? Number(maxAttendees) : null,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          status: 'scheduled',
        } as never,
      });
      if (error) {
        toast.error('Failed to create session.');
        return;
      }
      toast.success(`Session "${title}" scheduled`);
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
            New session
          </Button>
        }
      />

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            New session
          </DialogTitle>
          <DialogDescription>Schedule a live training session for your course.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Title + Instructor */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-title">Title *</Label>
              <Input id="cs-title" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. React Hooks Workshop" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-inst" className="flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground" />
                Instructor
              </Label>
              <Input id="cs-inst" value={instructor} onChange={(e) => setInstructor(e.target.value)}
                placeholder="Instructor name" />
            </div>
          </div>

          {/* Course */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-course">Course (optional)</Label>
            <select
              id="cs-course"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">— none —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cs-desc">Description</Label>
            <Textarea id="cs-desc" value={description} onChange={(e) => setDescription(e.target.value)}
              rows={2} placeholder="What will be covered in this session?" />
          </div>

          {/* Start + End */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-start">Start time *</Label>
              <Input id="cs-start" type="datetime-local" value={startTime}
                onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-end">End time *</Label>
              <Input id="cs-end" type="datetime-local" value={endTime}
                onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          {/* Location + Max attendees */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-loc" className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                Location
              </Label>
              <Input id="cs-loc" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="Room / Zoom link / Online" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cs-max">Max attendees</Label>
              <Input id="cs-max" type="number" min={1} value={maxAttendees}
                onChange={(e) => setMaxAttendees(e.target.value)}
                placeholder="Leave blank for unlimited" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Calendar />}
            Schedule session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
