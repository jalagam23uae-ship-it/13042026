'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { serverClient } from '@/lib/api/client';
import { createSession, destroySession } from '@/lib/auth/session';

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormState = {
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
  formError?: string;
} | null;

export type RegisterFormState = {
  fieldErrors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  formError?: string;
  success?: boolean;
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

  const token = data.access_token;
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

export async function registerAction(
  _prev: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const client = serverClient();
  const { error, response } = await client.POST('/auth/register', {
    body: { ...parsed.data, role: 'student', is_active: true },
  });

  if (error) {
    const detail =
      response.status === 400
        ? 'That email is already registered.'
        : 'Registration failed. Please try again.';
    return { formError: detail };
  }

  // Auto-login after successful registration.
  const loginRes = await client.POST('/auth/login', {
    body: { email: parsed.data.email, password: parsed.data.password },
  });
  const token = loginRes.data?.access_token;
  if (!token) {
    // Registration succeeded but auto-login failed — send them to /login.
    redirect('/login?registered=1');
  }
  await createSession(token);
  redirect('/');
}
