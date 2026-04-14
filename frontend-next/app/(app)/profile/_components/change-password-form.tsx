'use client';

import { useState, useTransition } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPw.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPw !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    startTransition(async () => {
      const client = browserClient();
      const { error } = await client.POST('/auth/change-password', {
        body: { old_password: oldPw, new_password: newPw } as never,
      });
      if (error) {
        toast.error('Failed to change password. Is the current password correct?');
        return;
      }
      toast.success('Password changed');
      setOldPw('');
      setNewPw('');
      setConfirm('');
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="old-pw">Current password</Label>
        <Input
          id="old-pw"
          type="password"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-pw">New password</Label>
        <Input
          id="new-pw"
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" disabled={isPending} size="sm" className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : <Lock />}
        Change password
      </Button>
    </form>
  );
}
