'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

function ForgotPasswordContent() {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset code');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
      }, 2000);
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('forgot.title')}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t('forgot.subtitle')}</p>
        </div>

        {success ? (
          <div className="p-4 rounded-lg bg-green-500/10 text-green-500 text-sm text-center">
            <p className="font-medium mb-2">{t('forgot.sent')}</p>
            <p className="text-xs opacity-80">{t('forgot.redirecting')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t('forgot.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? t('forgot.sending') : t('forgot.send')}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          <Link href="/auth/login" className="text-[var(--accent)] hover:underline font-medium">
            {t('forgot.back_to_login')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordContent />;
}
