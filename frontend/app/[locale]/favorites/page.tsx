'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';  // ← добавить useLocale
import { getAllTags, Tag, Prompt } from '@/lib/api';
import { checkAuth } from '@/lib/auth';
import PromptCard from '@/components/PromptCard';
import PromptFilters from '@/components/PromptFilters';
import { usePromptFilters } from '@/hooks/usePromptFilters';

export default function FavoritesPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();  // ← добавить эту строку
  
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPrompts, setTotalPrompts] = useState(0);
  const [neuralTags, setNeuralTags] = useState<Tag[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  const {
    search,
    setSearch,
    selectedNeural,
    setSelectedNeural,
    sort,
    setSort,
    page,
    setPage,
    handleFilterChange,
  } = usePromptFilters({ 
    enableUrlSync: true, 
    localStorageKey: 'promptov_filters_favorites' 
  });

  useEffect(() => {
    const loadInitialData = async () => {
      const user = await checkAuth();
      if (!user) {
        router.push('/login');
        return;
      }
      
      try {
        const tags = await getAllTags(locale);  // ← передаём locale
        setNeuralTags(tags);
        setFiltersInitialized(true);
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      }
    };
    loadInitialData();
  }, [router, locale]);  // ← добавить locale в зависимости

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('sort', sort);
      params.set('lang', locale);  // ← теперь locale определена
      if (search) params.set('search', search);
      if (selectedNeural) params.set('neural', selectedNeural);
      
      const response = await fetch(`/api/my/favorites/filtered?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (response.ok) {
        setPrompts(data.prompts || []);
        setTotalPages(data.pages || 1);
        setTotalPrompts(data.total || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки избранного:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filtersInitialized) {
      loadFavorites();
    }
  }, [page, sort, search, selectedNeural, filtersInitialized, locale]);

  const startItem = (page - 1) * 12 + 1;
  const endItem = Math.min(page * 12, totalPrompts);

  if (loading && !prompts.length) {
    return (
      <div className="min-h-screen bg-white">
        <div className="text-center py-12">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">❤️ {t('favorites.title')}</h1>
        
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sticky top-20">
              <h2 className="font-semibold text-gray-900 mb-4 pb-2 border-b">{t('filters.title')}</h2>
              <PromptFilters
                showSearch={true}
                showCategories={false}
                showNeuralNetworks={true}
                showSort={true}
                showStatus={false}
                neuralTags={neuralTags}
                search={search}
                setSearch={setSearch}
                selectedCategoryId={null}
                setSelectedCategoryId={() => {}}
                selectedNeural={selectedNeural}
                setSelectedNeural={setSelectedNeural}
                sort={sort}
                setSort={setSort}
                sortOptions={[
                  { value: 'newest', label: `📅 ${t('filters.newest')}` },
                  { value: 'oldest', label: `📅 ${t('filters.oldest')}` },
                  { value: 'popular', label: `🔥 ${t('filters.popular')}` },
                ]}
                onFilterChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-4 flex justify-between items-center">
              <p className="text-gray-600">
                {totalPrompts > 0 ? (
                  <>{t('favorites.showing_favorites', { start: startItem, end: endItem, total: totalPrompts })}</>
                ) : (
                  t('favorites.no_favorites')
                )}
              </p>
            </div>

            {prompts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">🤍</div>
                <p className="text-gray-500">
                  {search || selectedNeural
                    ? t('favorites.no_favorites_filtered')
                    : t('favorites.no_favorites_yet')}
                </p>
                <Link href="/" className="text-blue-600 hover:underline mt-2 inline-block">
                  {t('favorites.go_to_prompts')}
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                  {prompts.map((prompt) => (
                    <PromptCard key={prompt.id} prompt={prompt} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                    >
                      ← {t('common.back')}
                    </button>
                    <span className="px-4 py-2 text-gray-600">
                      {t('common.page')} {page} {t('common.of')} {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                    >
                      {t('common.next')} →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}