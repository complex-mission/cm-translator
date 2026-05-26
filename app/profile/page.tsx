'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useI18n } from '@/lib/i18n';
import Header from '@/components/Header';

function ProfileContent() {
  const { user, loading, refresh } = useAuth();
  const { t } = useI18n();
  const [nickname, setNickname] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState('');

  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      setAvatarId(user.avatarId);
    }
  }, [user]);

  const saveProfile = async () => {
    setSaving(true); setMessage('');
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatarId, privacyMode }),
      });
      if (res.ok) { setMessage(t('profile.updated')); refresh(); }
      else { const d = await res.json(); setMessage(d.error || t('profile.failed')); }
    } catch { setMessage(t('profile.network')); } finally { setSaving(false); }
  };

  const changePassword = async () => {
    setPwSaving(true); setPwMessage('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (res.ok) { setPwMessage(t('profile.pw_changed')); setOldPassword(''); setNewPassword(''); }
      else { const d = await res.json(); setPwMessage(d.error || t('profile.failed')); }
    } catch { setPwMessage(t('profile.network')); } finally { setPwSaving(false); }
  };

  if (loading) return null;
  if (!user) return <div className="min-h-screen"><Header /><div className="flex items-center justify-center h-[80vh] text-[var(--text-secondary)]">{t('profile.signin_required')}</div></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6 w-full space-y-8">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('profile.title')}</h1>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t('profile.avatar')}</h2>
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-3">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((id) => (
              <button
                key={id}
                onClick={() => setAvatarId(id)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                  avatarId === id ? 'border-[var(--accent)] scale-105 ring-2 ring-[var(--accent)]/30' : 'border-transparent hover:border-[var(--border)]'
                }`}
              >
                <img
                  src={`/avatar/a-${id}.webp`}
                  alt={`Avatar ${id}`}
                  className="w-full aspect-square object-cover rounded-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${id}&size=80&background=random`;
                  }}
                />
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('profile.basic')}</h2>
          <div>
            <label className="block text-xs text-[var(--text-tertiary)] mb-1">{t('profile.nickname')}</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--border-focus)]" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-tertiary)] mb-1">{t('profile.email')}</label>
            <input type="email" value={user.email} disabled
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="privacy" checked={privacyMode} onChange={(e) => setPrivacyMode(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="privacy" className="text-sm text-[var(--text-secondary)]">{t('profile.privacy')}</label>
          </div>
          {message && <p className={`text-sm ${message.includes('updated') || message.includes('更新') ? 'text-green-500' : 'text-red-500'}`}>{message}</p>}
          <button onClick={saveProfile} disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50">
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('profile.change_pw')}</h2>
          <div>
            <label className="block text-xs text-[var(--text-tertiary)] mb-1">{t('profile.current_pw')}</label>
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--border-focus)]" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-tertiary)] mb-1">{t('profile.new_pw')}</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--border-focus)]" />
          </div>
          {pwMessage && <p className={`text-sm ${pwMessage.includes('changed') || pwMessage.includes('変更') || pwMessage.includes('변경') ? 'text-green-500' : 'text-red-500'}`}>{pwMessage}</p>}
          <button onClick={changePassword} disabled={pwSaving || !oldPassword || !newPassword}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50">
            {pwSaving ? t('profile.pw_changing') : t('profile.pw_change')}
          </button>
        </section>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return <ProfileContent />;
}
