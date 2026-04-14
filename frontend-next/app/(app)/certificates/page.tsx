import { requireUser, getSessionToken } from '@/lib/auth/session';
import { serverClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ClipboardCheck, Lock } from 'lucide-react';
import { CertificateActions } from './certificate-actions';

type EligibleCertificate = {
  course_id: number;
  course_title: string;
  eligible?: boolean | null;
  issued?: boolean | null;
  certificate_id?: string | null;
  issued_at?: string | null;
  passed_test?: boolean | null;
  best_score?: number | null;
};

export default async function CertificatesPage() {
  await requireUser();
  const token = await getSessionToken();
  const client = serverClient(token);

  const { data, error } = await client.GET('/certificates/eligible', {});
  const certs = (Array.isArray(data) ? data : []) as EligibleCertificate[];

  const issuedCount = certs.filter((c) => c.issued).length;
  const eligibleCount = certs.filter((c) => c.eligible && !c.issued).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          Pass a course test to earn your certificate.
        </p>
      </div>

      {/* Summary strip */}
      {certs.length > 0 && (
        <div className="flex gap-4">
          <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100">
              <ShieldCheck className="size-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-xl font-bold">{issuedCount}</div>
              <p className="text-[11px] text-muted-foreground">Issued</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100">
              <ClipboardCheck className="size-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-bold">{eligibleCount}</div>
              <p className="text-[11px] text-muted-foreground">Ready to claim</p>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load certificates.
          </CardContent>
        </Card>
      ) : certs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No certificates available yet. Enroll in a course and pass its test to earn one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certs.map((cert) => (
            <Card
              key={cert.course_id}
              className={
                cert.issued
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : cert.eligible
                    ? 'border-blue-200 bg-blue-50/30'
                    : ''
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`flex size-9 items-center justify-center rounded-xl ${
                    cert.issued ? 'bg-emerald-100' : cert.eligible ? 'bg-blue-100' : 'bg-muted'
                  }`}>
                    {cert.issued ? (
                      <ShieldCheck className="size-5 text-emerald-600" />
                    ) : cert.eligible ? (
                      <ClipboardCheck className="size-5 text-blue-600" />
                    ) : (
                      <Lock className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  {cert.issued ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-500">Issued</Badge>
                  ) : cert.eligible ? (
                    <Badge variant="secondary" className="border-blue-200 text-blue-700">Ready to claim</Badge>
                  ) : (
                    <Badge variant="outline">Not eligible</Badge>
                  )}
                </div>
                <CardTitle className="mt-2 text-base">{cert.course_title}</CardTitle>
                {cert.certificate_id ? (
                  <CardDescription className="font-mono text-xs">
                    {cert.certificate_id}
                  </CardDescription>
                ) : null}
              </CardHeader>

              <CardContent className="flex flex-col gap-2">
                {/* Test score row */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Test score</span>
                  {cert.passed_test ? (
                    <span className="font-semibold text-emerald-600">{cert.best_score}% — Passed ✓</span>
                  ) : (
                    <span className="text-muted-foreground">Not passed yet</span>
                  )}
                </div>

                {/* Status text */}
                <p className="text-xs text-muted-foreground">
                  {cert.issued
                    ? cert.issued_at
                      ? `Issued ${new Date(cert.issued_at).toLocaleDateString()}`
                      : 'Certificate issued'
                    : cert.eligible
                      ? 'You passed the test — claim your certificate below.'
                      : 'Pass at least one course test to become eligible.'}
                </p>
              </CardContent>

              <CardFooter>
                <CertificateActions
                  courseId={cert.course_id}
                  issued={Boolean(cert.issued)}
                  eligible={Boolean(cert.eligible)}
                  certificateId={cert.certificate_id ?? null}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
