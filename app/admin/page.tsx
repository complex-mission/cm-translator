'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import Link from 'next/link';
import { Users, FileText, Settings, Image } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalTranslations: number;
  todayTranslations: number;
  totalTokens: number;
}

function AdminContent() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/admin/stats').then((r) => r.json()).then(setStats).catch(() => {});
    }
  }, [user]);

  if (loading) return null;
  if (!user || user.role !== 'admin') {
    return <div className="min-h-screen"><Header /><div className="flex items-center justify-center h-[80vh] text-[var(--text-secondary)]">{t('admin.access_denied')}</div></div>;
  }

  const navItems = [
    { href: '/admin/users', label: t('admin.users'), Icon: Users },
    { href: '/admin/records', label: t('admin.records'), Icon: FileText },
    { href: '/admin/config', label: t('admin.config'), Icon: Settings },
    { href: '/admin/avatars', label: t('admin.avatars'), Icon: Image },
  ];

  const statItems = stats ? [
    { label: t('admin.total_users'), value: stats.totalUsers },
    { label: t('admin.total_translations'), value: stats.totalTranslations },
    { label: t('admin.today'), value: stats.todayTranslations },
    { label: t('admin.total_tokens'), value: stats.totalTokens },
  ] : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-6 w-full">
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-6">{t('admin.title')}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] transition-colors text-center">
              <item.Icon className="w-8 h-8 mx-auto text-[var(--text-secondary)]" />
              <p className="text-sm font-medium text-[var(--text-primary)] mt-2">{item.label}</p>
            </Link>
          ))}
        </div>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statItems.map((s) => (
              <div key={s.label} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
                <p className="text-xs text-[var(--text-tertiary)]">{s.label}</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return <AdminContent />;
}
