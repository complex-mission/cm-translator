'use client';

import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { I18nProvider, useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const AVATARS = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  src: `/avatar/a-${i + 1}.webp`,
}));

function AvatarsContent() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) return null;
  if (!user || user.role !== 'admin') return <div className="min-h-screen"><Header /><div className="flex items-center justify-center h-[80vh] text-[var(--text-secondary)]">{t('admin.access_denied')}</div></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-6 w-full">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('admin.avatars')}</h1>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
          {AVATARS.map(a => (
            <div key={a.id} className="aspect-square rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-secondary)]">
              <img src={a.src} alt={`Avatar ${a.id}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminAvatarsPage() {
  return (
    <ThemeProvider><I18nProvider><AuthProvider><AvatarsContent /></AuthProvider></I18nProvider></ThemeProvider>
  );
}
