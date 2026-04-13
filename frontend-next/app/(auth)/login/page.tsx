import { redirect } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  // If already logged in, go straight to the dashboard.
  const user = await getCurrentUser();
  if (user) redirect('/');

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center gap-3">
        <GraduationCap className="size-9 text-primary" />
        <CardTitle className="text-2xl">ATP</CardTitle>
        <CardDescription>Sign in to the Automate Training Platform</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
