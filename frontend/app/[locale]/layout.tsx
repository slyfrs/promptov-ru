// frontend/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import './globals.css';
import type { Metadata } from 'next';

// Генерация статических параметров для всех локалей
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Генерация метаданных для SEO
export async function generateMetadata({ params }: { params: { locale: string } }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  
  return {
    title: t('app_name'),
    description: t('app_description'),
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'), // ← добавить
    icons: {
      icon: [
        { url: '/icon-16.svg', sizes: '16x16', type: 'image/svg+xml' },
        { url: '/favicon.svg', sizes: '32x32', type: 'image/svg+xml' },
      ],
      apple: '/favicon.svg',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;
  
  // Проверяем, поддерживается ли язык
  if (!locales.includes(locale as any)) {
    notFound();
  }
  
  const messages = await getMessages();
  
  return (
    <html lang={locale}>
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <Navigation />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
