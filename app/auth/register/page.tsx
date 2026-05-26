'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/components/AuthProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type Step = 'email' | 'verify';

function RegisterContent() {
  const router = useRouter();
  const { t } = useI18n();
  const { register } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendCooldown = (seconds = 60) => {
    setResendIn(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const checkPasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    setPasswordStrength(score);
  };

  const sendCode = async (isResend = false) => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-register-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setStep('verify');
      setInfo(t(isResend ? 'register.code_resent' : 'register.code_sent'));
      startResendCooldown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendCode(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await register({ email, password, code, nickname: nickname || undefined });
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
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {step === 'email' ? t('register.subtitle') : t('register.verify_subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">{error}</div>
        )}
        {info && !error && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm">{info}</div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t('register.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? t('register.sending_code') : t('register.send_code')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{t('register.email')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="flex-1 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] outline-none"
                />
                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(''); setError(''); setInfo(''); }}
                  className="text-xs text-[var(--accent)] hover:underline whitespace-nowrap"
                >
                  {t('register.change_email')}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[var(--text-secondary)]">{t('register.code')}</label>
                <button
                  type="button"
                  onClick={() => sendCode(true)}
                  disabled={resendIn > 0 || loading}
                  className="text-xs text-[var(--accent)] hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resendIn > 0 ? t('register.resend_in', { sec: String(resendIn) }) : t('register.resend')}
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] transition-colors tracking-[0.5em] text-center font-mono"
                placeholder="000000"
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
              disabled={loading || code.length !== 6 || !password}
              className="w-full py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? t('register.creating') : t('register.create')}
            </button>
          </form>
        )}

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
