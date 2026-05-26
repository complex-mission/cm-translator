import { db } from './db';
import { Globe, Code, BookOpen, MessageCircle, PenTool } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

const MODE_PROMPTS: Record<string, string> = {
  general: `You are a professional translator. Translate the following text accurately and naturally. Preserve the original meaning, tone, and formatting. Only output the translation, nothing else.`,
  technical: `You are a technical translator specializing in software documentation and technical content. Translate the following text with precise technical terminology. Preserve code blocks, technical terms, and formatting. Only output the translation.`,
  academic: `You are an academic translator. Translate the following text in a formal academic style, maintaining scholarly tone and precision. Preserve citations and references. Only output the translation.`,
  colloquial: `You are a translator who specializes in natural, conversational language. Translate the following text into casual, everyday language that native speakers would use. Only output the translation.`,
  literary: `You are a literary translator. Translate the following text preserving its artistic style, metaphors, and emotional nuances. Maintain the beauty of the original prose or poetry. Only output the translation.`,
};

export interface TranslateOptions {
  text: string;
  sourceLang: string;
  targetLang: string;
  mode?: string;
  userId?: bigint;
  ip?: string;
  userAgent?: string;
}

export interface TranslateStreamResult {
  stream: ReadableStream;
  controller: AbortController;
  detectedLang?: string;
}

export async function translateStream(opts: TranslateOptions): Promise<TranslateStreamResult> {
  const { text, sourceLang, targetLang, mode = 'general' } = opts;
  const controller = new AbortController();

  const systemPrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.general;
  const langName = getLanguageName(targetLang);
  const srcLangName = sourceLang === 'auto' ? 'the detected language' : getLanguageName(sourceLang);

  const autoDetectInstruction = sourceLang === 'auto'
    ? `IMPORTANT: First, detect the language of the source text. Output ONLY the 2-letter language code (e.g., "zh", "en", "ja", "ko", "fr", "de", "es", "pt", "ru", "ar", "it", "nl", "pl", "th", "vi", "id", "tr", "hi", "uk") on the first line by itself, then output the translation starting from the second line. Do NOT include any other text or labels.`
    : '';

  const userMessage = sourceLang === 'auto'
    ? `Translate the following text to ${langName}. ${autoDetectInstruction} Text:\n\n${text}`
    : `Translate the following text from ${srcLangName} to ${langName}. Text:\n\n${text}`;

  const startTime = Date.now();

  const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.3,
    }),
    signal: controller.signal,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${err}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  let fullTranslation = '';
  let tokensUsed = 0;
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(streamController) {
      const encoder = new TextEncoder();
      let buffer = '';
      let langDetected = false;
      let langBuffer = '';
      let isFirstLine = true;
      let skipNextNewline = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                if (sourceLang === 'auto' && !langDetected) {
                  langBuffer += content;
                  const langMatch = langBuffer.match(/^([a-z]{2})\s*\n/);
                  if (langMatch) {
                    const detectedLang = langMatch[1];
                    if (SUPPORTED_LANGUAGES.find((l) => l.code === detectedLang)) {
                      langDetected = true;
                      streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ detectedLang })}\n\n`));
                      const remaining = langBuffer.slice(langMatch[0].length);
                      if (remaining) {
                        fullTranslation += remaining;
                        streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ content: remaining })}\n\n`));
                      }
                      skipNextNewline = true;
                    }
                  } else if (langBuffer.length > 5) {
                    langDetected = true;
                    fullTranslation += langBuffer;
                    streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ content: langBuffer })}\n\n`));
                  }
                } else {
                  if (skipNextNewline && content === '\n') {
                    skipNextNewline = false;
                    continue;
                  }
                  skipNextNewline = false;
                  fullTranslation += content;
                  streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              }
              if (parsed.usage) {
                tokensUsed = parsed.usage.total_tokens || 0;
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        if (sourceLang === 'auto' && !langDetected && langBuffer) {
          fullTranslation += langBuffer;
          streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ content: langBuffer })}\n\n`));
        }

        const latencyMs = Date.now() - startTime;
        streamController.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, tokensUsed, latencyMs, translation: fullTranslation })}\n\n`)
        );
        streamController.close();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          streamController.error(err);
        }
      }
    },
  });

  return { stream, controller };
}

export async function translateSync(opts: TranslateOptions) {
  const { text, sourceLang, targetLang, mode = 'general' } = opts;
  const systemPrompt = MODE_PROMPTS[mode] || MODE_PROMPTS.general;
  const langName = getLanguageName(targetLang);
  const srcLangName = sourceLang === 'auto' ? 'the detected language' : getLanguageName(sourceLang);

  const userMessage = sourceLang === 'auto'
    ? `Translate the following text to ${langName}. Text:\n\n${text}`
    : `Translate the following text from ${srcLangName} to ${langName}. Text:\n\n${text}`;

  const startTime = Date.now();

  const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`);
  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  return {
    translation: data.choices[0].message.content,
    tokensUsed: data.usage?.total_tokens || 0,
    latencyMs,
    model: DEEPSEEK_MODEL,
  };
}

export function getLanguageName(code: string): string {
  const langs: Record<string, string> = {
    auto: 'Auto Detect',
    en: 'English',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    pt: 'Portuguese',
    ru: 'Russian',
    ar: 'Arabic',
    it: 'Italian',
    nl: 'Dutch',
    pl: 'Polish',
    th: 'Thai',
    vi: 'Vietnamese',
    id: 'Indonesian',
    tr: 'Turkish',
    hi: 'Hindi',
    uk: 'Ukrainian',
  };
  return langs[code] || code.toUpperCase();
}

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'zh', name: 'Chinese' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'hi', name: 'Hindi' },
  { code: 'uk', name: 'Ukrainian' },
];

export const TRANSLATION_MODES: { id: string; name: string; iconComponent: LucideIcon; description: string }[] = [
  { id: 'general', name: 'General', iconComponent: Globe, description: 'Standard translation' },
  { id: 'technical', name: 'Technical', iconComponent: Code, description: 'Software & documentation' },
  { id: 'academic', name: 'Academic', iconComponent: BookOpen, description: 'Scholarly & formal' },
  { id: 'colloquial', name: 'Colloquial', iconComponent: MessageCircle, description: 'Casual & natural' },
  { id: 'literary', name: 'Literary', iconComponent: PenTool, description: 'Artistic & nuanced' },
];
