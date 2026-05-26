'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import { SUPPORTED_LANGUAGES } from '@/lib/deepseek';
import { Copy, ArrowRightLeft, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface HistoryRecord {
  id: string;
  sourceLang: string;
  targetLang: string;
  sourceText: string | null;
  translatedText: string | null;
  mode: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  createdAt: string;
}

function HistoryContent() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sourceLang, setSourceLang] = useState('');
  const [targetLang, setTargetLang] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getLangName = (code: string) => t(`lang.${code}`);

  const fetchHistory = async () => {
    setLoadingData(true);
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: '20',
      ...(search && { search }),
      ...(sourceLang && { sourceLang }),
      ...(targetLang && { targetLang }),
    });
    try {
      const res = await fetch(`/api/translate/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
        setTotal(data.total);
      }
    } catch {} finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { if (user) fetchHistory(); }, [user, page, search, sourceLang, targetLang]);

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(t('history.confirm_delete', { count: String(selectedIds.size) }))) return;
    await fetch(`/api/translate/history?ids=${Array.from(selectedIds).join(',')}`, { method: 'DELETE' });
    setSelectedIds(new Set());
    fetchHistory();
  };

  const exportHistory = async (format: string) => {
    const res = await fetch(`/api/translate/export?format=${format}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations.${format === 'csv' ? 'csv' : format === 'markdown' ? 'md' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadIntoEditor = (record: HistoryRecord) => {
    localStorage.setItem('prefill', JSON.stringify({
      text: record.sourceText,
      sourceLang: record.sourceLang,
      targetLang: record.targetLang,
      mode: record.mode,
    }));
    window.location.href = '/';
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
          {t('history.signin_required')}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('history.title')}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => exportHistory('json')} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">JSON</button>
            <button onClick={() => exportHistory('csv')} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">CSV</button>
            <button onClick={() => exportHistory('markdown')} className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]">Markdown</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t('history.search')} className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--border-focus)]" />
          <select value={sourceLang} onChange={(e) => { setSourceLang(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm">
            <option value="">{t('history.any_source')}</option>
            {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => <option key={l.code} value={l.code}>{getLangName(l.code)}</option>)}
          </select>
          <select value={targetLang} onChange={(e) => { setTargetLang(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm">
            <option value="">{t('history.any_target')}</option>
            {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => <option key={l.code} value={l.code}>{getLangName(l.code)}</option>)}
          </select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-sm">
            <span>{t('history.selected', { count: String(selectedIds.size) })}</span>
            <button onClick={deleteSelected} className="flex items-center gap-1 text-red-500 hover:underline">
              <Trash2 className="w-3.5 h-3.5" />
              {t('history.delete')}
            </button>
          </div>
        )}

        {loadingData ? <div className="flex justify-center py-12"><div className="spinner" /></div> : records.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-tertiary)]">{t('history.empty')}</div>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg-tertiary)]" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                  <input type="checkbox" checked={selectedIds.has(r.id)} onChange={(e) => { e.stopPropagation(); const next = new Set(selectedIds); if (next.has(r.id)) next.delete(r.id); else next.add(r.id); setSelectedIds(next); }} className="w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">{r.sourceText || t('history.privacy')}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{getLangName(r.sourceLang)} → {getLangName(r.targetLang)} · {t(`mode.${r.mode}`)} · {new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)] shrink-0">{r.latencyMs}ms</span>
                </div>
                {expandedId === r.id && (
                  <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><p className="text-xs text-[var(--text-tertiary)] mb-1">{t('history.source')}</p><p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{r.sourceText || '—'}</p></div>
                      <div><p className="text-xs text-[var(--text-tertiary)] mb-1">{t('history.translation')}</p><p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{r.translatedText || '—'}</p></div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
                      <button onClick={() => navigator.clipboard.writeText(r.translatedText || '')} className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                        <Copy className="w-3 h-3" />
                        {t('history.copy_translation')}
                      </button>
                      <button onClick={() => loadIntoEditor(r)} className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                        <ArrowRightLeft className="w-3 h-3" />
                        {t('history.load_editor')}
                      </button>
                      <span className="text-xs text-[var(--text-tertiary)] ml-auto">{r.model} · {r.tokensUsed} {t('common.tokens')}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {total > 20 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
              {t('history.previous')}
            </button>
            <span className="text-sm text-[var(--text-tertiary)]">{t('history.page', { page: String(page) })}</span>
            <button onClick={() => setPage(page + 1)} disabled={records.length < 20} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-secondary)] disabled:opacity-30">
              {t('history.next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return <HistoryContent />;
}
