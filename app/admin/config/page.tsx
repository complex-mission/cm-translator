'use client';

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { I18nProvider, useI18n } from '@/lib/i18n';
import Header from '@/components/Header';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

interface ConfigItem {
  configKey: string;
  configValue: string;
}

function ConfigContent() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/admin/config').then(r => r.json()).then(data => {
        const map: Record<string, string> = {};
        data.forEach((c: ConfigItem) => { map[c.configKey] = c.configValue; });
        setConfigs(map);
        setLoadingData(false);
      }).catch(() => setLoadingData(false));
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const items = Object.entries(configs).map(([configKey, configValue]) => ({ configKey, configValue }));
    await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ configs: items }) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return null;
  if (!user || user.role !== 'admin') return <div className="min-h-screen"><Header /><div className="flex items-center justify-center h-[80vh] text-[var(--text-secondary)]">{t('admin.access_denied')}</div></div>;

  const fields = [
    { key: 'app_name', label: 'App Name', type: 'text' },
    { key: 'deepseek_model', label: 'AI Model', type: 'text' },
    { key: 'max_chars_guest', label: 'Max Chars (Guest)', type: 'number' },
    { key: 'max_chars_user', label: 'Max Chars (User)', type: 'number' },
    { key: 'daily_quota_guest', label: 'Daily Quota (Guest)', type: 'number' },
    { key: 'daily_quota_user', label: 'Daily Quota (User)', type: 'number' },
    { key: 'rate_limit_per_minute', label: 'Rate Limit / min', type: 'number' },
    { key: 'announcement', label: 'Announcement', type: 'textarea' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6 w-full">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('admin.config')}</h1>
        </div>
        {loadingData ? <div className="flex justify-center py-12"><div className="spinner" /></div> : (
          <div className="space-y-4">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea value={configs[f.key] || ''} onChange={e => setConfigs({ ...configs, [f.key]: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--border-focus)]" />
                ) : (
                  <input type={f.type} value={configs[f.key] || ''} onChange={e => setConfigs({ ...configs, [f.key]: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--border-focus)]" />
                )}
              </div>
            ))}
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminConfigPage() {
  return (
    <ThemeProvider><I18nProvider><AuthProvider><ConfigContent /></AuthProvider></I18nProvider></ThemeProvider>
  );
}
