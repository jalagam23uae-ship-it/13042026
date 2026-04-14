'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { browserClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useApiMutation } from '@/hooks/use-api-mutation';

type UserRow = { id: number; name: string; email: string; role: string };

type Target = 'all' | 'students' | 'instructors' | 'custom';

export function BroadcastForm({ users }: { users: UserRow[] }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [link, setLink] = useState('');
  const [target, setTarget] = useState<Target>('students');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const filtered = users.filter((u) =>
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

  function resolveRecipients(): UserRow[] {
    if (target === 'all') return users.filter((u) => u.role !== 'admin');
    if (target === 'students') return users.filter((u) => u.role === 'student');
    if (target === 'instructors') return users.filter((u) => u.role === 'instructor');
    return users.filter((u) => selected.has(u.id));
  }

  const { mutate: broadcast, isPending: pending } = useApiMutation(
    async (recipients: UserRow[]) => {
      const client = browserClient();
      let ok = 0;
      let fail = 0;
      for (const u of recipients) {
        const { error } = await client.POST('/notifications/', {
          body: {
            user_id: u.id,
            title: title.trim(),
            message: message.trim() || null,
            type,
            link: link.trim() || null,
          },
        });
        if (error) fail++;
        else ok++;
      }
      if (ok === 0) {
        return { error: { detail: 'Failed to send.' } };
      }
      return { data: { ok, fail } };
    },
    {
      onSuccess: (result) => {
        if (result.fail > 0) {
          toast.success(`Sent to ${result.ok}, ${result.fail} failed`);
        } else {
          toast.success(`Sent to ${result.ok} recipient${result.ok === 1 ? '' : 's'}`);
        }
        setTitle('');
        setMessage('');
        setLink('');
        setSelected(new Set());
      },
      refresh: false,
    },
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }
    const recipients = resolveRecipients();
    if (recipients.length === 0) {
      toast.error('No recipients selected.');
      return;
    }
    broadcast(recipients);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="n-title">Title *</Label>
          <Input
            id="n-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="n-type">Type</Label>
          <select
            id="n-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="n-message">Message</Label>
        <Textarea
          id="n-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="n-link">Link (optional)</Label>
        <Input
          id="n-link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="/courses/42"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Recipients</Label>
        <div className="flex flex-wrap gap-2 text-sm">
          {(['students', 'instructors', 'all', 'custom'] as Target[]).map((t) => (
            <label
              key={t}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1"
            >
              <input
                type="radio"
                name="target"
                checked={target === t}
                onChange={() => setTarget(t)}
              />
              <span className="capitalize">
                {t === 'all' ? 'Everyone' : t === 'custom' ? 'Pick users' : t}
              </span>
            </label>
          ))}
        </div>
      </div>

      {target === 'custom' ? (
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-48 overflow-y-auto rounded-md border">
            <ul className="divide-y text-sm">
              {filtered.slice(0, 200).map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-3 py-1.5">
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggle(u.id)}
                    className="size-4"
                  />
                  <span className="flex-1 truncate">{u.name}</span>
                  <span className="text-xs text-muted-foreground">{u.email}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {u.role}
                  </span>
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No users match.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? <Loader2 className="animate-spin" /> : <Send />}
        Send broadcast
      </Button>
    </form>
  );
}
