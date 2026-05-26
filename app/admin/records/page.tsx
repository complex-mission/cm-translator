'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

function RecordsContent() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  const fetchRecords = async () => {
    setLoadingData(true);
    const res = await fetch(`/api/admin/records?${new URLSearchParams({ page: page.toString(), search })}`);
    if (res.ok) { const d = await res.json(); setRecords(d.records); setTotal(d.total); }
    setLoadingData(false);
  };

  useEffect(() => { if (user?.role === 'admin') fetchRecords(); }, [user, page, search]);

  if (loading) return null;
  if (!user || user.role !== 'admin') return <div className="min-h-screen"><Header /><div className="flex items-center justify-center h-[80vh] text-[var(--text-secondary)]">{t('admin.access_denied')}</div></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-6 w-full">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">← {t('admin.title')}</Link>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('admin.records.title')}</h1>
        </div>
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t('admin.records.search')} className="w-full max-w-sm px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm mb-4 outline-none focus:border-[var(--border-focus)]" />
        {loadingData ? <div className="flex justify-center py-12"><div className="spinner" /></div> : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">{r.sourceLang} → {r.targetLang}</span>
                    <span className="text-xs text-[var(--text-tertiary)]">{t(`mode.${r.mode}`)}</span>
                    {r.flagged && <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500"><AlertTriangle className="w-3 h-3" /> {t('admin.records.flagged')}</span>}
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><p className="text-xs text-[var(--text-tertiary)] mb-1">{t('admin.records.source')}</p><p className="text-sm text-[var(--text-primary)] line-clamp-3">{r.sourceText || t('admin.records.privacy')}</p></div>
                  <div><p className="text-xs text-[var(--text-tertiary)] mb-1">{t('admin.records.translation')}</p><p className="text-sm text-[var(--text-primary)] line-clamp-3">{r.translatedText || t('admin.records.privacy')}</p></div>
                </div>
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-tertiary)]">
                  <span>{t('admin.users.email')}: {r.user?.email || t('admin.records.guest')}</span><span>·</span><span>{r.model}</span><span>·</span><span>{r.tokensUsed} {t('common.tokens')}</span><span>·</span><span>{r.latencyMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminRecordsPage() {
  return <RecordsContent />;
}
