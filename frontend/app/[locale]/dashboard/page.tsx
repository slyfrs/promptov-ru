'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';  // ← добавить useLocale
import { checkAuth, logout, User } from '@/lib/auth';
import { getMyPrompts, Prompt, publishPrompt, deletePrompt, getAllTags, Tag } from '@/lib/api';
import PromptCard from '@/components/PromptCard';
import PromptFilters from '@/components/PromptFilters';
import { usePromptFilters } from '@/hooks/usePromptFilters';
import { useToast } from '@/components/Toast';

export default function DashboardPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();  // ← добавить эту строку
  const { showToast, ToastComponent } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [neuralTags, setNeuralTags] = useState<Tag[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  const {
    search,
    setSearch,
    selectedNeural,
    setSelectedNeural,
    sort,
    setSort,
    selectedStatus,
    setSelectedStatus,
    page,
    setPage,
    handleFilterChange,
  } = usePromptFilters({ 
    enableUrlSync: true, 
    localStorageKey: 'promptov_filters_dashboard', 
    defaultStatus: 'all' 
  });

  useEffect(() => {
    const loadData = async () => {
      const userData = await checkAuth();
      
      if (!userData) {
        router.push('/login');
        return;
      }
      
      setUser(userData);
      
      try {
        const tags = await getAllTags(locale);
        setNeuralTags(tags);
        await loadNotifications();
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      }
      
      setLoading(false);
      setFiltersInitialized(true);
    };
    
    loadData();
  }, [router, locale]);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('sort', sort);
      params.set('lang', locale);  // ← добавить
      if (search) params.set('search', search);
      if (selectedNeural) params.set('neural', selectedNeural);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);

      const response = await fetch(`/api/my/prompts/filtered?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (response.ok) {
        setPrompts(data.prompts || []);
        setTotalPages(data.pages || 1);
      }
    } catch (error) {
      console.error('Ошибка загрузки промптов:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && filtersInitialized) {
      loadPrompts();
    }
  }, [page, sort, search, selectedNeural, selectedStatus, user, filtersInitialized, locale]);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        credentials: 'include',
      });
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showToast(t('dashboard.avatar_invalid_type'), 'error');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      showToast(t('dashboard.avatar_too_large'), 'error');
      return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    setUploadingAvatar(true);
    
    try {
      const response = await fetch('/api/auth/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setUser(prev => prev ? { ...prev, avatar_url: data.avatar_url } : null);
        showToast(t('dashboard.avatar_success'), 'success');
      } else {
        showToast(data.error || t('dashboard.avatar_error'), 'error');
      }
    } catch (error) {
      showToast(t('dashboard.avatar_error'), 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  const handlePublish = async (id: number) => {
    try {
      await publishPrompt(id);
      await loadPrompts();
    } catch (error: any) {
      if (error.message?.includes('Подтвердите email')) {
        showToast(t('dashboard.email_not_confirmed_error'), 'error');
      } else {
        showToast(t('dashboard.publish_error'), 'error');
      }
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(t('dashboard.delete_confirm', { title }))) {
      return;
    }
    
    try {
      await deletePrompt(id);
      await loadPrompts();
    } catch (error) {
      showToast(t('dashboard.delete_error'), 'error');
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return t('dashboard.time_ago.just_now');
    if (diff < 3600) return t('dashboard.time_ago.minutes_ago', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('dashboard.time_ago.hours_ago', { count: Math.floor(diff / 3600) });
    return t('dashboard.time_ago.days_ago', { count: Math.floor(diff / 86400) });
  };

  const getPromptWithUser = (prompt: Prompt): Prompt => {
    return {
      ...prompt,
      user: {
        id: user?.id || 0,
        username: user?.username || t('dashboard.you'),
        avatar_url: user?.avatar_url || '',
      },
    };
  };

  if (loading && !prompts.length) {
    return (
      <main className="min-h-screen bg-white">
        <div className="text-center py-12">{t('common.loading')}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-[#f5f5f7] rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.username} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-500"
                  />
                ) : (
                  <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <label 
                  htmlFor="avatar-upload" 
                  className={`absolute bottom-0 right-0 bg-gray-800 text-white rounded-full p-1 cursor-pointer hover:bg-gray-700 text-xs ${uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={t('dashboard.upload_avatar_title')}
                >
                  {uploadingAvatar ? '⏳' : '📷'}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
                <p className="text-gray-600 mt-2">
                  {t('dashboard.welcome', { username: user?.username || t('common.anonymous') })}
                </p>
              </div>
            </div>
            <Link
              href="/create-prompt"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-900 transition-colors"
            >
              + {t('dashboard.create_prompt_button')}
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sticky top-20">
              <h2 className="font-semibold text-gray-900 mb-4 pb-2 border-b">{t('filters.title')}</h2>
              <PromptFilters
                showSearch={true}
                showCategories={false}
                showNeuralNetworks={true}
                showSort={true}
                showStatus={true}
                neuralTags={neuralTags}
                search={search}
                setSearch={setSearch}
                selectedCategoryId={null}
                setSelectedCategoryId={() => {}}
                selectedNeural={selectedNeural}
                setSelectedNeural={setSelectedNeural}
                sort={sort}
                setSort={setSort}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
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
                {prompts.length > 0 
                  ? t('dashboard.showing_prompts', { start: (page - 1) * 12 + 1, end: Math.min(page * 12, prompts.length), total: prompts.length })
                  : t('dashboard.no_prompts')}
              </p>
            </div>

            {prompts.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500">{t('dashboard.no_prompts_filters')}</p>
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedStatus('all');
                    setSelectedNeural('');
                    setSort('newest');
                  }}
                  className="text-blue-600 hover:underline mt-2 inline-block"
                >
                  {t('filters.reset')}
                </button>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {prompts.map((prompt) => (
                  <div key={prompt.id} className="relative">
                    <PromptCard prompt={getPromptWithUser(prompt)} />
                    
                    {/* Элементы управления — в центре верхней части карточки */}
                    <div className="absolute top-3 left-1/2 transform -translate-x-1/2 flex gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm z-10">
                      {/* Статус */}
                      {prompt.status === 'private' && (
                        <span className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs" title={t('dashboard.status.private')}>
                          📝
                        </span>
                      )}
                      {prompt.status === 'pending' && (
                        <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs" title={t('dashboard.status.pending')}>
                          ⏳
                        </span>
                      )}
                      {prompt.status === 'published' && (
                        <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs" title={t('dashboard.status.published')}>
                          ✅
                        </span>
                      )}
                      {prompt.status === 'rejected' && (
                        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs" title={t('dashboard.status.rejected')}>
                          ❌
                        </span>
                      )}
                      
                      {/* Разделитель (только если есть кнопка публикации) */}
                      {prompt.status === 'private' && (
                        <div className="w-px h-4 bg-gray-300 my-auto"></div>
                      )}
                      
                      {/* Кнопка публикации (только для черновиков) */}
                      {prompt.status === 'private' && (
                        <button
                          onClick={() => handlePublish(prompt.id)}
                          className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs hover:bg-blue-600 transition-colors"
                          title={t('dashboard.publish_button')}
                        >
                          📤
                        </button>
                      )}
                      
                      {/* Кнопка редактирования */}
                      <button
                        onClick={() => router.push(`/edit-prompt/${prompt.id}`)}
                        className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs hover:bg-yellow-600 transition-colors"
                        title={t('dashboard.edit_button')}
                      >
                        ✏️
                      </button>
                      
                      {/* Кнопка удаления */}
                      <button
                        onClick={() => handleDelete(prompt.id, prompt.title)}
                        className="bg-red-500 text-white px-2 py-1 rounded-full text-xs hover:bg-red-600 transition-colors"
                        title={t('dashboard.delete_button')}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
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
      {ToastComponent}
    </main>
  );
}