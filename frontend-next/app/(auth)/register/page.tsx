import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/session';
import { RegisterForm } from './register-form';

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect('/');

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center gap-3">
        <GraduationCap className="size-9 text-primary" />
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>Register as a student on ATP.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
