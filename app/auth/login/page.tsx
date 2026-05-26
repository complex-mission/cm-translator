'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/components/AuthProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function LoginContent() {
  const router = useRouter();
  const { t } = useI18n();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-secondary)] relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('login.welcome')}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t('login.email')}</label>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-[var(--text-secondary)]">{t('login.password')}</label>
              <Link href="/auth/forgot-password" className="text-xs text-[var(--accent)] hover:underline">
                {t('login.forgot')}
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
          >
            {loading ? t('login.signing') : t('login.signin')}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          {t('login.no_account')}{' '}
          <Link href="/auth/register" className="text-[var(--accent)] hover:underline font-medium">
            {t('login.signup')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <LoginContent />;
}
