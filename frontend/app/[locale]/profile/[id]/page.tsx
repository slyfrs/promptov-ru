'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import PromptCard from '@/components/PromptCard';
import PromptFilters from '@/components/PromptFilters';
import { usePromptFilters } from '@/hooks/usePromptFilters';
import { getPublicProfile, getAllTags } from '@/lib/api';
import type { Prompt, Tag } from '@/lib/api';  // ← импорт типа из api
import { checkAuth } from '@/lib/auth';
import type { User } from '@/lib/auth';  // ← импорт типа из auth

// Убираем отдельный интерфейс ProfileUser, используем User
// interface ProfileUser { ... }  ← УДАЛИТЬ

interface ProfileStats {
  prompts_count: number;
  total_likes: number;
}

export default function ProfilePage() {
  const t = useTranslations();
  const params = useParams();
  const locale = useLocale();
  const userId = parseInt(params.id as string);
  
  const [profileUser, setProfileUser] = useState<User | null>(null);  // ← используем User
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPrompts, setTotalPrompts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [neuralTags, setNeuralTags] = useState<Tag[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);

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
    localStorageKey: 'promptov_filters_profile' 
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileData, currentUserData, tags] = await Promise.all([
          getPublicProfile(userId),
          checkAuth(),
          getAllTags(locale),
        ]);
        const badgesRes = await fetch(`/api/user/badges/${userId}`);
        const badgesData = await badgesRes.json();
        if (badgesRes.ok) {
          setBadges(badgesData.badges || []);
        }
        
        setProfileUser(profileData.user);
        setStats(profileData.stats);
        setCurrentUser(currentUserData);
        setNeuralTags(tags);
        setFiltersInitialized(true);
      } catch (err: any) {
        setError(err.message || t('profile.load_error'));
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [userId, t, locale]);

  const loadUserPrompts = async () => {
    if (!profileUser) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('sort', sort);
      params.set('lang', locale);
      if (search) params.set('search', search);
      if (selectedNeural) params.set('neural', selectedNeural);
      
      const response = await fetch(`/api/profile/${userId}/prompts?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (response.ok) {
        setPrompts(data.prompts || []);
        setTotalPages(data.pages || 1);
        setTotalPrompts(data.total || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки промптов:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileUser && filtersInitialized) {
      loadUserPrompts();
    }
  }, [page, sort, search, selectedNeural, profileUser, filtersInitialized, locale]);

  const getIconForTheme = (theme: string): string => {
    const icons: Record<string, string> = {
      'Копирайтинг': '✍️',
      'Программирование': '💻',
      'Дизайн': '🎨',
      'Маркетинг': '📈',
      'Образование': '📚',
      'Творчество': '🎭',
      'Аналитика': '📊',
      'Перевод': '🌐',
      'HR и Резюме': '👔',
      'Развлечения': '🎮',
    };
    return icons[theme] || '🤖';
  };

  const startItem = (page - 1) * 12 + 1;
  const endItem = Math.min(page * 12, totalPrompts);

  if (loading && !profileUser) {
    return (
      <div className="min-h-screen bg-white">
        <div className="text-center py-12">{t('common.loading')}</div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-white">
        <div className="text-center py-12 text-red-500">{error || t('profile.not_found')}</div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Карточка профиля */}
        <div className="bg-[#f5f5f7] rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-6">
            {profileUser.avatar_url ? (
              <img 
                src={profileUser.avatar_url}
                alt={profileUser.username}
                className="w-24 h-24 rounded-full object-cover border-2 border-blue-500"
              />
            ) : (
              <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-3xl">
                {profileUser.username?.[0]?.toUpperCase()}
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{profileUser.username}</h1>
                {profileUser.email_confirmed ? (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full inline-flex items-center gap-1" title={t('profile.email_confirmed_title')}>
                    ✅ {t('profile.email_confirmed')}
                  </span>
                ) : (
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full inline-flex items-center gap-1" title={t('profile.email_not_confirmed_title')}>
                    ⚠️ {t('profile.email_not_confirmed')}
                  </span>
                )}
                {isOwnProfile && (
                  <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-700">
                    ✏️ {t('profile.edit_button')}
                  </Link>
                )}
              </div>
              <p className="text-gray-600 mb-2">{t('profile.member_since')} {new Date(profileUser.created_at).toLocaleDateString('ru-RU')}</p>
              <div className="flex gap-6 text-sm">
                <span className="text-gray-600">📝 {stats?.prompts_count || 0} {t('profile.prompts_count')}</span>
                <span className="text-gray-600">❤️ {stats?.total_likes || 0} {t('profile.likes_count')}</span>
              </div>
            </div>
          </div>
          
          {/* Бейджи */}
          {badges.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('profile.badges_title')}</h3>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    <span>{badge.icon}</span>
                    <span>{badge.title}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Остальной код без изменений (город, соцсети, био) */}
          {(profileUser.city || profileUser.birth_date || profileUser.telegram || profileUser.github || profileUser.website) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              {profileUser.city && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span>📍</span>
                  <span>{profileUser.city}</span>
                </div>
              )}
              {profileUser.birth_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span>🎂</span>
                  <span>{new Date(profileUser.birth_date).toLocaleDateString('ru-RU')}</span>
                </div>
              )}
              {profileUser.telegram && (
                <a href={`https://t.me/${profileUser.telegram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                  <span>📱</span>
                  <span>@{profileUser.telegram}</span>
                </a>
              )}
              {profileUser.github && (
                <a href={`https://github.com/${profileUser.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:underline">
                  <span>💻</span>
                  <span>{profileUser.github}</span>
                </a>
              )}
              {profileUser.website && (
                <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
                  <span>🌐</span>
                  <span>{profileUser.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>
          )}
          
          {profileUser.bio && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-gray-700 whitespace-pre-wrap">{profileUser.bio}</p>
            </div>
          )}
        </div>
        
        {/* Фильтры и список промптов - без изменений */}
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
                  <>{t('profile.showing_prompts', { start: startItem, end: endItem, total: totalPrompts })}</>
                ) : (
                  t('profile.no_prompts')
                )}
              </p>
            </div>

            {prompts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">
                  {isOwnProfile 
                    ? t('profile.no_prompts_self') 
                    : t('profile.no_prompts_user')}
                </p>
                {isOwnProfile && (
                  <Link href="/create-prompt" className="text-blue-600 hover:underline mt-2 inline-block">
                    ✏️ {t('profile.create_first_prompt')}
                  </Link>
                )}
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