'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useI18n } from '@/lib/i18n';
import { SUPPORTED_LANGUAGES, TRANSLATION_MODES } from '@/lib/deepseek';
import { ArrowRightLeft, Copy, Check, Square, Languages, Trash2 } from 'lucide-react';

interface TranslationResult {
  content: string;
  done: boolean;
  tokensUsed?: number;
  latencyMs?: number;
}

export default function TranslatePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [mode, setMode] = useState('general');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<{ tokensUsed: number; latencyMs: number } | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_CHARS = user ? 5000 : 1000;

  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGUAGES.find((l) => l.code === browserLang)) {
      setTargetLang(browserLang);
    }
    try {
      const raw = localStorage.getItem('prefill');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.text) setSourceText(data.text);
        if (data.sourceLang) setSourceLang(data.sourceLang);
        if (data.targetLang) setTargetLang(data.targetLang);
        if (data.mode) setMode(data.mode);
        setCharCount(data.text?.length || 0);
        localStorage.removeItem('prefill');
      }
    } catch {}
  }, []);

  const handleInput = (value: string) => {
    if (value.length <= MAX_CHARS) {
      setSourceText(value);
      setCharCount(value.length);
    }
  };

  const swapLanguages = () => {
    if (sourceLang === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const translate = useCallback(async () => {
    if (!sourceText.trim() || isTranslating) return;

    setIsTranslating(true);
    setTranslatedText('');
    setError('');
    setStats(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/translate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, sourceLang, targetLang, mode }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Translation failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              setTranslatedText((prev) => prev + data.content);
            }
            if (data.done) {
              setStats({ tokensUsed: data.tokensUsed || 0, latencyMs: data.latencyMs || 0 });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Translation failed');
      }
    } finally {
      setIsTranslating(false);
      abortRef.current = null;
    }
  }, [sourceText, sourceLang, targetLang, mode, isTranslating]);

  const stopTranslation = () => {
    abortRef.current?.abort();
    setIsTranslating(false);
  };

  const copyTranslation = async () => {
    if (!translatedText) return;
    await navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      translate();
    }
  };

  const getModeName = (id: string) => {
    const key = `mode.${id}`;
    return t(key);
  };

  const getModeDesc = (id: string) => {
    const key = `mode.${id}.desc`;
    return t(key);
  };

  const getLangName = (code: string) => {
    const key = `lang.${code}`;
    return t(key);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Mode selector */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {TRANSLATION_MODES.map((m) => {
          const Icon = m.iconComponent;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                mode === m.id
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
              title={getModeDesc(m.id)}
            >
              <Icon className="w-4 h-4" />
              <span>{getModeName(m.id)}</span>
            </button>
          );
        })}
      </div>

      {/* Translation area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source panel */}
        <div className="relative rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{getLangName(l.code)}</option>
              ))}
            </select>
            <span className="text-xs text-[var(--text-tertiary)]">
              {charCount}/{MAX_CHARS}
            </span>
          </div>

          <textarea
            ref={textareaRef}
            value={sourceText}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('panel.placeholder')}
            className="w-full p-4 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none outline-none min-h-[200px] lg:min-h-[300px]"
          />

          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)]">
            <button
              onClick={() => { setSourceText(''); setTranslatedText(''); setCharCount(0); setStats(null); }}
              className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('panel.clear')}
            </button>
            {isTranslating ? (
              <button
                onClick={stopTranslation}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-colors"
              >
                <Square className="w-3 h-3" />
                {t('panel.stop')}
              </button>
            ) : (
              <button
                onClick={translate}
                disabled={!sourceText.trim() || charCount > MAX_CHARS}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Languages className="w-4 h-4" />
                {t('panel.translate')}
              </button>
            )}
          </div>
        </div>

        {/* Target panel */}
        <div className="relative rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                  <option key={l.code} value={l.code}>{getLangName(l.code)}</option>
                ))}
              </select>
              <button
                onClick={swapLanguages}
                disabled={sourceLang === 'auto'}
                className="p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                title={t('panel.swap')}
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>
            {stats && (
              <span className="text-xs text-[var(--text-tertiary)]">
                {stats.latencyMs}ms · {stats.tokensUsed} {t('common.tokens')}
              </span>
            )}
          </div>

          <div className="relative min-h-[200px] lg:min-h-[300px] p-4">
            {isTranslating && !translatedText && (
              <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
                <div className="spinner" />
                <span className="text-sm">{t('panel.translating')}</span>
              </div>
            )}
            {translatedText && (
              <div className="whitespace-pre-wrap text-[var(--text-primary)] animate-fade-in">
                {translatedText}
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-sm text-red-500">{error}</p>
                <button
                  onClick={translate}
                  className="text-sm text-[var(--accent)] hover:underline"
                >
                  {t('panel.tryagain')}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end px-4 py-2 border-t border-[var(--border)]">
            <button
              onClick={copyTranslation}
              disabled={!translatedText}
              className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  {t('panel.copied')}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  {t('panel.copy')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Guest notice */}
      {!user && (
        <div className="mt-4 text-center text-sm text-[var(--text-tertiary)]">
          <span>{t('panel.guest', { max: String(MAX_CHARS) })} </span>
          <a href="/auth/register" className="text-[var(--accent)] hover:underline">{t('panel.signup_hint')}</a>
          <span>{t('panel.signup_suffix')}</span>
        </div>
      )}
    </div>
  );
}
