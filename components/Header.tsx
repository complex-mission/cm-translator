'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import { useI18n } from '@/lib/i18n';
import { useState } from 'react';
import { History, User, Settings, LogOut } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolved } = useTheme();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const avatarUrl = user ? `/avatar/a-${user.avatarId}.webp` : null;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
          <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          <span>CM Translator</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
            title={resolved === 'dark' ? t('theme.switch_light') : t('theme.switch_dark')}
          >
            {resolved === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <img
                  src={avatarUrl!}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${user.nickname}&size=56`; }}
                />
                <span className="text-sm text-[var(--text-primary)] hidden sm:inline">{user.nickname}</span>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 py-1 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-lg z-50 animate-fade-in">
                    <div className="px-4 py-2 border-b border-[var(--border)]">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user.nickname}</p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">{user.email}</p>
                    </div>
                    <Link href="/history" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                      <History className="w-4 h-4" />
                      {t('nav.history')}
                    </Link>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                      <User className="w-4 h-4" />
                      {t('nav.profile')}
                    </Link>
                    {user.role === 'admin' && (
                      <Link href="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                        <Settings className="w-4 h-4" />
                        {t('nav.admin')}
                      </Link>
                    )}
                    <div className="border-t border-[var(--border)]" />
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('nav.signout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login" className="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                {t('nav.signin')}
              </Link>
              <Link href="/auth/register" className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors">
                {t('nav.signup')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
