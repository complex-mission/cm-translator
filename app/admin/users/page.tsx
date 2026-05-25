'use client';

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { I18nProvider, useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface UserRecord {
  id: string; email: string; nickname: string; role: string; status: string;
  dailyQuota: number; createdAt: string; _count: { translations: number };
}

function UsersContent() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  const fetchUsers = async () => {
    setLoadingData(true);
    const res = await fetch(`/api/admin/users?${new URLSearchParams({ page: page.toString(), search })}`);
    if (res.ok) { const d = await res.json(); setUsers(d.users); setTotal(d.total); }
    setLoadingData(false);
  };

  useEffect(() => { if (user?.role === 'admin') fetchUsers(); }, [user, page, search]);

  const toggleBan = async (userId: string, currentStatus: string) => {
    await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, status: currentStatus === 'banned' ? 'active' : 'banned' }) });
    fetchUsers();
  };

  if (loading) return null;
  if (!user || user.role !== 'admin') return <div className="min-h-screen"><Header /><div className="flex items-center justify-center h-[80vh] text-[var(--text-secondary)]">{t('admin.access_denied')}</div></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-6 w-full">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">← {t('admin.title')}</Link>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('admin.users.title')}</h1>
        </div>
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t('admin.users.search')} className="w-full max-w-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm mb-4 outline-none focus:border-[var(--border-focus)]" />
        {loadingData ? <div className="flex justify-center py-12"><div className="spinner" /></div> : (
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-tertiary)]"><tr>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">{t('admin.users.email')}</th>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">{t('admin.users.nickname')}</th>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">{t('admin.users.role')}</th>
                <th className="text-left px-4 py-3 text-[var(--text-secondary)] font-medium">{t('admin.users.status')}</th>
                <th className="text-right px-4 py-3 text-[var(--text-secondary)] font-medium">{t('admin.users.translations')}</th>
                <th className="text-right px-4 py-3 text-[var(--text-secondary)] font-medium">{t('admin.users.actions')}</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-[var(--border)] hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-3 text-[var(--text-primary)]">{u.email}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{u.nickname}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-500' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>{u.role}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${u.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{u.status}</span></td>
                    <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{u._count.translations}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => toggleBan(u.id, u.status)} className={`text-xs ${u.status === 'banned' ? 'text-green-500' : 'text-red-500'} hover:underline`}>{u.status === 'banned' ? t('admin.users.unban') : t('admin.users.ban')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 20 && (
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> {t('history.previous')}
            </button>
            <span className="text-sm text-[var(--text-tertiary)] py-1.5">{t('history.page', { page: String(page) })}</span>
            <button onClick={() => setPage(page + 1)} disabled={users.length < 20} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm disabled:opacity-30">
              {t('history.next')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <ThemeProvider><I18nProvider><AuthProvider><UsersContent /></AuthProvider></I18nProvider></ThemeProvider>
  );
}
