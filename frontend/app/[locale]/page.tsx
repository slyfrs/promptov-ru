// frontend/app/[locale]/page.tsx
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getPublicPromptsServer, getCategoriesServer, getAllTagsServer } from '@/lib/api-server';
import PromptCard from '@/components/PromptCard';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Script from 'next/script'

const ClientFilters = dynamic(
  () => import('@/components/ClientFilters'),
  { ssr: false }
);

// frontend/app/[locale]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  return {
    title: t('app_name'),
    description: t('app_description'),
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `/${locale}`,  // ← добавить
      languages: {
        'ru': '/ru',
        'en': '/en',
      },
    },
    openGraph: {
      title: t('app_name'),
      description: t('app_description'),
      type: 'website',
    },
  };
}



interface HomePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; sort?: string; search?: string; tag?: string; category?: string }>;
}

export default async function HomePage({ params, searchParams }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const sp = await searchParams;
  const page = parseInt(sp.page || '1');
  const sort = sp.sort || 'newest';
  const search = sp.search || '';
  const tagName = sp.tag || '';        // ← название нейросети
  const categoryName = sp.category || '';  // ← название категории
  
  // Загружаем данные на сервере
  const [promptsData, categories, neuralTags] = await Promise.all([
    getPublicPromptsServer(page, sort, search, tagName, categoryName, locale),
    getCategoriesServer(locale),
    getAllTagsServer(locale),
  ]);
  
  const { prompts, total, pages } = promptsData;
  
  const startItem = (page - 1) * 12 + 1;
  const endItem = Math.min(page * 12, total);
  
  return (
        <>
      {/* Структурированные данные JSON-LD */}
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Promptov.ru",
            "description": "Каталог и рейтинг промптов для нейросетей",
            "url": baseUrl,
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${baseUrl}/${locale}?search={search_term_string}`
              },
              "query-input": "required name=search_term_string"
            }
          })
        }}
      />
      
    <div className="min-h-screen bg-white">
        <div className="text-center py-8 mb-6 border-b border-gray-100">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{t('app_name')}</h1>
          <p className="text-lg text-gray-500">{t('app_description')}</p>
        </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sticky top-20">
              <Suspense fallback={<div className="h-96 animate-pulse bg-gray-100 rounded" />}>
                <ClientFilters
                  initialCategories={categories}
                  initialNeuralTags={neuralTags}
                  initialSearch={search}
                  initialTagName={tagName}
                  initialCategoryName={categoryName}
                  initialSort={sort}
                  locale={locale}
                />
              </Suspense>
            </div>
          </div>
          
          <div className="lg:col-span-3">
            {prompts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">{t('no_prompts')}</p>
                <Link href="/create-prompt" className="text-blue-600 hover:underline mt-2 inline-block">
                  {t('be_first_author')}
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-4 text-gray-600 text-sm">
                  {total > 0 && (
                    <>{t('showing_prompts', { start: startItem, end: endItem, total: total })}</>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                  {prompts.map((prompt) => (
                    <PromptCard key={prompt.id} prompt={prompt} />
                  ))}
                </div>
                
                {pages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {page > 1 && (
                      <Link
                        href={`/${locale}?${new URLSearchParams({ ...sp, page: (page - 1).toString() })}`}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        ← {t('back')}
                      </Link>
                    )}
                    <span className="px-4 py-2 text-gray-600">
                      {t('page')} {page} {t('of')} {pages}
                    </span>
                    {page < pages && (
                      <Link
                        href={`/${locale}?${new URLSearchParams({ ...sp, page: (page + 1).toString() })}`}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {t('next')} →
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}