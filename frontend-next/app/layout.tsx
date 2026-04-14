import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono, Cairo } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppQueryProvider } from '@/lib/api/query-client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

// Arabic font — Cairo supports both Arabic and Latin scripts
const cairo = Cairo({
  variable: '--font-arabic',
  subsets: ['arabic', 'latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'ATP',
  description: 'Automate Training Platform',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRtl = locale === 'ar';

  return (
    <html
      lang={locale}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={[
        plusJakartaSans.variable,
        jetbrainsMono.variable,
        cairo.variable,
        'h-full antialiased',
        isRtl ? 'font-arabic' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <AppQueryProvider>
              <TooltipProvider delay={200}>
                {children}
                <Toaster richColors />
              </TooltipProvider>
            </AppQueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
