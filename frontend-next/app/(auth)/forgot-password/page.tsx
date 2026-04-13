import Link from 'next/link';
import { Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center gap-3">
        <CardTitle className="text-2xl">Forgot password?</CardTitle>
        <CardDescription>Ask your administrator to reset it for you.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert>
          <Info className="size-4" />
          <AlertTitle>Admin-only reset</AlertTitle>
          <AlertDescription>
            Password resets are handled by your site administrator. Contact them with
            your registered email address and they will issue you a temporary password.
          </AlertDescription>
        </Alert>
        <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
