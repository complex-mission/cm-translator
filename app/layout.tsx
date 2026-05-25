import type { Metadata } from 'next';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cm-translator.com';
const SITE_NAME = 'CM Translator';
const SITE_DESC = 'AI-powered translation tool with real-time streaming responses. Translate between 20+ languages instantly.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — AI Translation with Real-time Streaming`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: [
    'AI translation',
    'machine translation',
    'online translator',
    'real-time translation',
    'streaming translation',
    'online translator',
    '多语言翻译',
    'AI翻译',
    '翻訳',
    '번역',
  ],
  authors: [{ name: 'Complex Mission', url: 'https://github.com/complex-mission' }],
  creator: 'Complex Mission',
  publisher: 'Complex Mission',
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['zh_CN', 'ja_JP', 'ko_KR'],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — AI Translation with Real-time Streaming`,
    description: SITE_DESC,
    images: [
      {
        url: `${SITE_URL}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
        type: 'image/svg+xml',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — AI Translation`,
    description: SITE_DESC,
    images: [`${SITE_URL}/og-image.svg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
  },
  manifest: `${SITE_URL}/site.webmanifest`,
  alternates: {
    canonical: SITE_URL,
    languages: {
      'en': SITE_URL,
      'zh': `${SITE_URL}?lang=zh`,
      'ja': `${SITE_URL}?lang=ja`,
      'ko': `${SITE_URL}?lang=ko`,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <meta name="theme-color" content="#0a1628" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: SITE_NAME,
              url: SITE_URL,
              description: SITE_DESC,
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              author: {
                '@type': 'Organization',
                name: 'Complex Mission',
                url: 'https://github.com/complex-mission',
              },
              inLanguage: ['en', 'zh', 'ja', 'ko'],
              featureList: [
                'Real-time streaming translation',
                '20+ languages support',
                '5 translation modes',
                'Translation history',
                'Privacy mode',
                'Admin dashboard',
              ],
              screenshot: `${SITE_URL}/og-image.svg`,
              softwareVersion: '0.1.0',
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
