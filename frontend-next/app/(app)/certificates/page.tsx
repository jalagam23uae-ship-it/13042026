import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { CertificateActions } from './certificate-actions';

type EligibleCertificate = {
  course_id: number;
  course_title: string;
  eligible?: boolean | null;
  issued?: boolean | null;
  certificate_id?: string | null;
  issued_at?: string | null;
};

export default async function CertificatesPage() {
  await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/certificates/eligible', {});
  const certs = (Array.isArray(data) ? data : []) as EligibleCertificate[];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          Earn a certificate when you complete a course and pass its tests.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load certificates.
          </CardContent>
        </Card>
      ) : certs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No certificates available yet. Complete a course to earn one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certs.map((cert) => (
            <Card key={cert.course_id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <ShieldCheck className="size-6 text-primary" />
                  {cert.issued ? (
                    <Badge>Issued</Badge>
                  ) : cert.eligible ? (
                    <Badge variant="secondary">Eligible</Badge>
                  ) : (
                    <Badge variant="outline">In progress</Badge>
                  )}
                </div>
                <CardTitle className="mt-2 text-base">{cert.course_title}</CardTitle>
                {cert.certificate_id ? (
                  <CardDescription className="font-mono text-xs">
                    ID: {cert.certificate_id}
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {cert.issued_at
                  ? `Issued ${new Date(cert.issued_at).toLocaleDateString()}`
                  : cert.eligible
                    ? 'You have completed all requirements for this course.'
                    : 'Complete the course and pass all tests to become eligible.'}
              </CardContent>
              <CardFooter>
                <CertificateActions
                  courseId={cert.course_id}
                  issued={Boolean(cert.issued)}
                  eligible={Boolean(cert.eligible)}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
