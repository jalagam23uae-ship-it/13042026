'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Eye, EyeOff } from 'lucide-react';
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
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function CreateUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showPw, setShowPw] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'instructor' | 'admin'>('student');

  function reset() {
    setName(''); setEmail(''); setPassword(''); setRole('student'); setShowPw(false);
  }

  function submit() {
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
        body: { name: name.trim(), email: email.trim().toLowerCase(), password, role, is_active: true },
      });
      if (error) {
        toast.error('Failed to create user. Email may already be taken.');
        return;
      }
      toast.success(`User "${name}" created`);
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger render={<Button size="sm"><Plus />New user</Button>} />

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create new user</DialogTitle>
          <DialogDescription>Add a single user account. For bulk creation use &ldquo;Bulk import&rdquo;.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cu-name">Name *</Label>
              <Input id="cu-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cu-email">Email *</Label>
              <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cu-pw">Password *</Label>
              <div className="relative">
                <Input
                  id="cu-pw"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="≥ 6 characters"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cu-role">Role *</Label>
              <select
                id="cu-role"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Role hint */}
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Student</span> — enrol in courses &nbsp;·&nbsp;
            <span className="font-medium text-foreground">Instructor</span> — create content &nbsp;·&nbsp;
            <span className="font-medium text-foreground">Admin</span> — full access
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
