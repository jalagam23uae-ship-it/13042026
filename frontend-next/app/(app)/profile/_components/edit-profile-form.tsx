'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { browserClient } from '@/lib/api/client';
import { useApiMutation } from '@/hooks/use-api-mutation';

export function EditProfileForm({
  userId,
  initial,
}: {
  userId: number;
  initial: { name: string; email: string };
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);

  const { mutate: save, isPending } = useApiMutation(
    () =>
      browserClient().PUT('/users/{user_id}', {
        params: { path: { user_id: userId } },
        body: { name: name.trim(), email: email.trim().toLowerCase() } as never,
      }),
    {
      successMessage: 'Profile updated',
      errorMessage: 'Failed to update profile.',
    },
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    save(undefined);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-name">Name</Label>
        <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-email">Email</Label>
        <Input
          id="p-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isPending} size="sm" className="self-start">
        {isPending ? <Loader2 className="animate-spin" /> : <Save />}
        Save
      </Button>
    </form>
  );
}
