'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/components/AuthProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function RegisterContent() {
  const router = useRouter();
  const { t } = useI18n();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const checkPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    setPasswordStrength(score);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email, password, nickname || undefined);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = [t('register.weak'), t('register.fair'), t('register.good'), t('register.strong')];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-secondary)] relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('register.title')}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t('register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t('register.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t('register.nickname')}</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
              placeholder={t('register.nickname_ph')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t('register.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); checkPasswordStrength(e.target.value); }}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
              placeholder={t('register.password_ph')}
            />
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-[var(--border)]'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : t('register.short')}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? t('register.creating') : t('register.create')}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          {t('register.has_account')}{' '}
          <Link href="/auth/login" className="text-[var(--accent)] hover:underline font-medium">
            {t('register.signin')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <RegisterContent />;
}
