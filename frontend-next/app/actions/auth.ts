'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { serverClient } from '@/lib/api/client';
import { createSession, destroySession } from '@/lib/auth/session';

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormState = {
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
  formError?: string;
} | null;

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const client = serverClient();
  const { data, error, response } = await client.POST('/auth/login', {
    body: parsed.data,
  });

  if (error || !data) {
    const detail =
      response.status === 401
        ? 'Invalid email or password.'
        : response.status === 429
          ? 'Too many attempts. Please wait and try again.'
          : 'Login failed. Please try again.';
    return { formError: detail };
  }

  const token = (data as { access_token?: string }).access_token;
  if (!token) {
    return { formError: 'Login succeeded but no token was returned.' };
  }

  await createSession(token);
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}
