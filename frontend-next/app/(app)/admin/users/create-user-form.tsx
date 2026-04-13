'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function CreateUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'instructor' | 'admin'>('student');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error('Name, email, and password are required');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/users/', {
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          is_active: true,
        },
      });
      if (error) {
        toast.error('Failed to create user. Email may already be taken.');
        return;
      }
      toast.success(`User "${name}" created`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('student');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="u-name">Name *</Label>
          <Input
            id="u-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Full name"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="u-email">Email *</Label>
          <Input
            id="u-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="user@example.com"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="u-pw">Initial password *</Label>
          <Input
            id="u-pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="≥ 6 characters"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="u-role">Role *</Label>
          <select
            id="u-role"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
        Create user
      </Button>
    </form>
  );
}
