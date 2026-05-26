'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/components/AuthProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { I18nProvider, type Locale } from '@/lib/i18n';

export function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  return (
    <ThemeProvider>
      <I18nProvider initialLocale={initialLocale}>
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
