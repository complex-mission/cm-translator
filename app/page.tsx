'use client';

import { useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import TranslatePanel from '@/components/TranslatePanel';

export default function HomePage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="text-center pt-8 pb-4 px-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
            {t('home.title')}
          </h1>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto">
            {t('home.subtitle')}
          </p>
        </div>
        <TranslatePanel />
      </main>
      <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--text-tertiary)]">
        {t('home.footer')}
      </footer>
    </div>
  );
}

