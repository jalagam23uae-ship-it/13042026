'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { registerAction, type RegisterFormState } from '@/app/actions/auth';

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterFormState, FormData>(
    registerAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.formError ? (
        <Alert variant="destructive">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          aria-invalid={state?.fieldErrors?.name ? true : undefined}
        />
        {state?.fieldErrors?.name?.[0] ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state?.fieldErrors?.email ? true : undefined}
        />
        {state?.fieldErrors?.email?.[0] ? (
          <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={state?.fieldErrors?.password ? true : undefined}
        />
        {state?.fieldErrors?.password?.[0] ? (
          <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Minimum 6 characters.</p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
