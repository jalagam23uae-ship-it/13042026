'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('language');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale() {
    const next = locale === 'en' ? 'ar' : 'en';
    // Set cookie that survives full page loads (1 year)
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={isPending}
      title={t('switchTo')}
      className="flex items-center justify-center min-w-[2rem] h-7 rounded-md border border-input bg-background px-2 text-xs font-semibold hover:bg-accent transition-colors disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        t('switchTo')
      )}
    </button>
  );
}
