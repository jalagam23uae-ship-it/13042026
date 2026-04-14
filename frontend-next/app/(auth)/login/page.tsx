import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { GraduationCap, CheckCircle2, BookOpen, Award, Users } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { LoginForm } from './login-form';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect('/');

  const t = await getTranslations('auth');

  return (
    <div className="w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl flex min-h-[560px]">
      {/* ── Left branding panel ──────────────────────────────────── */}
      <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-10 text-white w-[45%] relative overflow-hidden">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-16 -left-16 size-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -right-12 size-72 rounded-full bg-white/5" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
            <GraduationCap className="size-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">ATP</span>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h2 className="text-3xl font-bold leading-snug">
            {t('tagline')}
          </h2>
          <p className="mt-3 text-sm text-blue-100 leading-relaxed">
            {t('taglineDesc')}
          </p>

          <ul className="mt-8 flex flex-col gap-3.5">
            {(['feature1', 'feature2', 'feature3'] as const).map((key) => (
              <li key={key} className="flex items-center gap-2.5 text-sm text-blue-100">
                <CheckCircle2 className="size-4 text-blue-300 shrink-0" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-blue-300 relative z-10">
          &copy; {new Date().getFullYear()} ATP &middot; {t('copyright')}
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────── */}
      <div className="flex flex-col justify-center bg-background px-8 py-10 w-full md:w-[55%] relative">
        {/* Language switcher — top right */}
        <div className="absolute top-4 end-4">
          <LanguageSwitcher />
        </div>

        {/* Mobile logo (shown only when left panel is hidden) */}
        <div className="flex flex-col items-center mb-8 md:hidden">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary mb-3">
            <GraduationCap className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">ATP</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('tagline')}</p>
        </div>

        {/* Desktop heading */}
        <div className="hidden md:block mb-8">
          <h2 className="text-2xl font-bold tracking-tight">{t('welcomeBack')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('signInToContinue')}
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
