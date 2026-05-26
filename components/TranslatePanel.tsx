'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { franc } from 'franc-min';
import { useAuth } from '@/components/AuthProvider';
import { useI18n } from '@/lib/i18n';
import { SUPPORTED_LANGUAGES, TRANSLATION_MODES } from '@/lib/deepseek';
import { ArrowRightLeft, Copy, Check, Square, Languages, Trash2, BookA } from 'lucide-react';

const FRANC_TO_ISO: Record<string, string> = {
  cmn: 'zh', jpn: 'ja', kor: 'ko', eng: 'en', fra: 'fr',
  deu: 'de', spa: 'es', por: 'pt', rus: 'ru', arb: 'ar',
  ita: 'it', nld: 'nl', pol: 'pl', tha: 'th', vie: 'vi',
  ind: 'id', tur: 'tr', hin: 'hi', ukr: 'uk',
};
const FRANC_ALLOWED = Object.keys(FRANC_TO_ISO);

export default function TranslatePage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [mode, setMode] = useState('general');
  const [effectiveMode, setEffectiveMode] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<{ tokensUsed: number; latencyMs: number } | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const MAX_CHARS = user ? 5000 : 1000;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('prefill');
      if (raw) {
        const data = JSON.parse(raw);
        const text = typeof data.text === 'string' ? data.text.slice(0, MAX_CHARS) : '';
        if (text) setSourceText(text);
        if (data.sourceLang) setSourceLang(data.sourceLang);
        if (data.targetLang) setTargetLang(data.targetLang);
        if (data.mode) setMode(data.mode);
        setCharCount(text.length);
        if ((data.sourceLang ?? 'auto') === 'auto' && text) {
          setDetectedLang(detectLanguage(text));
        }
        localStorage.removeItem('prefill');
        return;
      }
    } catch {}

    try {
      const savedSourceLang = localStorage.getItem('sourceLang');
      const savedTargetLang = localStorage.getItem('targetLang');
      const savedMode = localStorage.getItem('translationMode');
      if (savedSourceLang && SUPPORTED_LANGUAGES.find((l) => l.code === savedSourceLang)) {
        setSourceLang(savedSourceLang);
      }
      if (savedTargetLang && SUPPORTED_LANGUAGES.find((l) => l.code === savedTargetLang && l.code !== 'auto')) {
        setTargetLang(savedTargetLang);
      } else {
        const browserLang = navigator.language.split('-')[0];
        if (SUPPORTED_LANGUAGES.find((l) => l.code === browserLang)) {
          setTargetLang(browserLang);
        }
      }
      if (savedMode && TRANSLATION_MODES.find((m) => m.id === savedMode)) {
        setMode(savedMode);
      }
    } catch {
      const browserLang = navigator.language.split('-')[0];
      if (SUPPORTED_LANGUAGES.find((l) => l.code === browserLang)) {
        setTargetLang(browserLang);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('sourceLang', sourceLang);
      localStorage.setItem('targetLang', targetLang);
      localStorage.setItem('translationMode', mode);
    } catch {}
  }, [sourceLang, targetLang, mode]);

  const detectByScript = (text: string): string | null => {
    const clean = text.replace(/[\s\d.,!?;:'"()\-+=@#$%^&*\/\\[\]{}|`~]+/g, '');
    if (!clean.length) return null;
    let han = 0, kana = 0, hangul = 0, ar = 0, ru = 0, th = 0;
    for (const ch of clean) {
      const c = ch.charCodeAt(0);
      if ((c >= 0x3040 && c <= 0x309F) || (c >= 0x30A0 && c <= 0x30FF)) kana++;
      else if (c >= 0x4E00 && c <= 0x9FFF) han++;
      else if (c >= 0xAC00 && c <= 0xD7AF) hangul++;
      else if (c >= 0x0600 && c <= 0x06FF) ar++;
      else if (c >= 0x0400 && c <= 0x04FF) ru++;
      else if (c >= 0x0E00 && c <= 0x0E7F) th++;
    }
    const total = clean.length;
    if (kana > 0) return 'ja';
    if (hangul / total > 0.2) return 'ko';
    if (ar / total > 0.2) return 'ar';
    if (th / total > 0.2) return 'th';
    if (ru / total > 0.2) return 'ru';
    if (han / total > 0.2) return 'zh';
    return null;
  };

  const detectLanguage = (text: string): string | null => {
    if (!text.trim()) return null;
    // Kana is a sufficient signal — skip franc to avoid mis-classifying
    // mixed kanji-heavy Japanese as Chinese.
    const hasKana = /[぀-ヿ]/.test(text);
    if (hasKana) return 'ja';
    const code = franc(text, { only: FRANC_ALLOWED, minLength: 3 });
    if (code !== 'und' && FRANC_TO_ISO[code]) return FRANC_TO_ISO[code];
    return detectByScript(text) ?? 'en';
  };

  const pickFallbackTarget = (excluded: string) => {
    const candidates = ['en', 'zh', 'ja', 'ko'];
    const first = candidates.find((c) => c !== excluded);
    if (first) return first;
    const any = SUPPORTED_LANGUAGES.find((l) => l.code !== 'auto' && l.code !== excluded);
    return any?.code ?? 'en';
  };

  const handleInput = (value: string) => {
    const wasTruncated = value.length > MAX_CHARS;
    const next = wasTruncated ? value.slice(0, MAX_CHARS) : value;
    setSourceText(next);
    setCharCount(next.length);
    setTruncated(wasTruncated);
    if (sourceLang === 'auto') {
      const detected = detectLanguage(next);
      setDetectedLang(detected);
      if (detected && detected === targetLang) {
        setTargetLang(pickFallbackTarget(detected));
      }
    } else {
      setDetectedLang(null);
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
    setEffectiveMode(null);

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
              if (data.mode) setEffectiveMode(data.mode);
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
      <div className="flex items-center justify-center sm:justify-start gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {TRANSLATION_MODES.map((m) => {
          const Icon = m.iconComponent;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1.5 text-sm whitespace-nowrap transition-all ${
                isActive
                  ? 'px-3 py-1.5 rounded-full bg-[var(--accent)] text-white shadow-sm'
                  : 'w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-full sm:rounded-full justify-center sm:justify-start bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
              title={getModeDesc(m.id)}
            >
              <Icon className="w-4 h-4" />
              <span className={isActive ? 'inline' : 'hidden sm:inline'}>{getModeName(m.id)}</span>
            </button>
          );
        })}
      </div>

      {/* Translation area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source panel */}
        <div className="relative rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <select
                value={sourceLang}
                onChange={(e) => {
                  const newSourceLang = e.target.value;
                  setSourceLang(newSourceLang);
                  if (newSourceLang !== 'auto') setDetectedLang(null);
                  if (newSourceLang !== 'auto' && newSourceLang === targetLang) {
                    const available = SUPPORTED_LANGUAGES.find((l) => l.code !== 'auto' && l.code !== newSourceLang);
                    if (available) setTargetLang(available.code);
                  }
                }}
                className="bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none cursor-pointer max-w-[120px] sm:max-w-none"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{getLangName(l.code)}</option>
                ))}
              </select>
              {sourceLang === 'auto' && detectedLang && (
                <span className="text-xs text-[var(--text-tertiary)] truncate">
                  → {getLangName(detectedLang)}
                </span>
              )}
            </div>
            <span className={`text-xs whitespace-nowrap ${truncated ? 'text-amber-500' : 'text-[var(--text-tertiary)]'}`}>
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

          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] min-h-[52px]">
            <button
              onClick={() => {
                setSourceText('');
                setTranslatedText('');
                setCharCount(0);
                setStats(null);
                setDetectedLang(null);
                setTruncated(false);
                setError('');
                setEffectiveMode(null);
              }}
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
                onChange={(e) => {
                  const newTargetLang = e.target.value;
                  setTargetLang(newTargetLang);
                  if (sourceLang !== 'auto' && sourceLang === newTargetLang) {
                    setSourceLang('auto');
                  }
                }}
                className="bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none cursor-pointer max-w-[120px] sm:max-w-none"
              >
                {SUPPORTED_LANGUAGES.filter((l) => {
                  if (l.code === 'auto') return false;
                  const effectiveSource = sourceLang === 'auto' ? detectedLang : sourceLang;
                  return l.code !== effectiveSource;
                }).map((l) => (
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
              {effectiveMode === 'dictionary' && mode !== 'dictionary' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium">
                  <BookA className="w-3 h-3" />
                  {t('panel.dict_mode')}
                </span>
              )}
            </div>
            {stats && (
              <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
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
              <div className="text-[var(--text-primary)] animate-fade-in break-words text-base leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => (
                      <strong className="text-[var(--accent)] font-semibold">{children}</strong>
                    ),
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 sm:pl-6 space-y-1 mb-3 last:mb-0 marker:text-[var(--text-tertiary)]">
                        {children}
                      </ol>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 sm:pl-6 space-y-1 mb-3 last:mb-0 marker:text-[var(--text-tertiary)]">
                        {children}
                      </ul>
                    ),
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    code: ({ children }) => (
                      <code className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] font-mono text-[var(--text-secondary)]">
                        {children}
                      </code>
                    ),
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold mb-1.5 mt-1">{children}</h3>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-[var(--border)] pl-3 italic text-[var(--text-secondary)] my-2">
                        {children}
                      </blockquote>
                    ),
                    a: ({ children, href }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                        {children}
                      </a>
                    ),
                    hr: () => <hr className="my-3 border-[var(--border)]" />,
                  }}
                >
                  {translatedText}
                </ReactMarkdown>
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

          <div className="flex items-center justify-end px-4 py-2 border-t border-[var(--border)] min-h-[52px]">
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
      {!user && !loading && (
        <div className="mt-4 text-center text-sm text-[var(--text-tertiary)]">
          <span>{t('panel.guest', { max: String(MAX_CHARS) })} </span>
          <a href="/auth/register" className="text-[var(--accent)] hover:underline">{t('panel.signup_hint')}</a>
          <span>{t('panel.signup_suffix')}</span>
        </div>
      )}
    </div>
  );
}
