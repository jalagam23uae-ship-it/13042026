'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Trash2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type UserLite = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active?: boolean | null;
};

export function UserRowActions({ user }: { user: UserLite }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<'student' | 'instructor' | 'admin'>(
    (user.role as 'student' | 'instructor' | 'admin') ?? 'student',
  );

  function saveEdit() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.PUT('/users/{user_id}' as never, {
        params: { path: { user_id: user.id } },
        body: { name: name.trim(), email: email.trim().toLowerCase(), role } as never,
      } as never);
      if (error) {
        toast.error('Failed to update user');
        return;
      }
      toast.success('User updated');
      setOpen(false);
      router.refresh();
    });
  }

  function toggleActive() {
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.PUT('/users/{user_id}' as never, {
        params: { path: { user_id: user.id } },
        body: { is_active: !user.is_active } as never,
      } as never);
      if (error) {
        toast.error('Failed to update status');
        return;
      }
      toast.success(user.is_active ? 'User deactivated' : 'User activated');
      router.refresh();
    });
  }

  function deleteUser() {
    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.DELETE('/users/{user_id}' as never, {
        params: { path: { user_id: user.id } },
      } as never);
      if (error) {
        toast.error('Failed to delete user');
        return;
      }
      toast.success('User deleted');
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
        aria-label="Edit user"
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleActive}
        disabled={isPending}
        aria-label={user.is_active ? 'Deactivate user' : 'Activate user'}
        title={user.is_active ? 'Deactivate' : 'Activate'}
      >
        <Power className={`size-3.5 ${user.is_active ? 'text-green-600' : 'text-muted-foreground'}`} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={deleteUser}
        disabled={isPending}
        aria-label="Delete user"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5 text-destructive" />}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update name, email, or role.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-name-${user.id}`}>Name</Label>
              <Input
                id={`edit-name-${user.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-email-${user.id}`}>Email</Label>
              <Input
                id={`edit-email-${user.id}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-role-${user.id}`}>Role</Label>
              <select
                id={`edit-role-${user.id}`}
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
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
