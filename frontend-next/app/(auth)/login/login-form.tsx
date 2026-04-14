'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { loginAction, type LoginFormState } from '@/app/actions/auth';

export function LoginForm() {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.formError ? (
        <Alert variant="destructive">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email" className="text-sm font-medium">
          {t('emailAddress')}
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            required
            className="ps-9"
            aria-invalid={state?.fieldErrors?.email ? true : undefined}
          />
        </div>
        {state?.fieldErrors?.email?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium">
            {t('password')}
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors"
          >
            {t('forgotPassword')}
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            className="ps-9"
            aria-invalid={state?.fieldErrors?.password ? true : undefined}
          />
        </div>
        {state?.fieldErrors?.password?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={pending} className="w-full h-10 font-semibold mt-1">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin me-2" />
            {t('signingIn')}
          </>
        ) : (
          t('signIn')
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link
          href="/register"
          className="font-semibold text-primary hover:underline underline-offset-2 transition-colors"
        >
          {t('createAccount')}
        </Link>
      </p>
    </form>
  );
}
