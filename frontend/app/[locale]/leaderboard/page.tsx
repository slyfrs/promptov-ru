'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface LeaderboardUser {
  rank: number;
  user_id: number;
  username: string;
  avatar_url: string;
  value: number;
}

export default function LeaderboardPage() {
  const t = useTranslations();
  const [topPrompts, setTopPrompts] = useState<LeaderboardUser[]>([]);
  const [topLikes, setTopLikes] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'prompts' | 'likes'>('prompts');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [promptsRes, likesRes] = await Promise.all([
          fetch('/api/leaderboard/top-prompts?limit=10'),
          fetch('/api/leaderboard/top-likes?limit=10'),
        ]);
        
        const promptsData = await promptsRes.json();
        const likesData = await likesRes.json();
        
        setTopPrompts(promptsData.leaderboard || []);
        setTopLikes(likesData.leaderboard || []);
      } catch (error) {
        console.error('Ошибка загрузки лидерборда:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankStyles = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400';
    if (rank === 2) return 'bg-gray-200 text-gray-700 ring-2 ring-gray-300';
    if (rank === 3) return 'bg-orange-100 text-orange-800 ring-2 ring-orange-300';
    return 'bg-gray-100 text-gray-600';
  };

  const currentData = activeTab === 'prompts' ? topPrompts : topLikes;
  const titleText = activeTab === 'prompts' ? t('leaderboard.by_prompts') : t('leaderboard.by_likes');

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="text-center py-12">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏆 {t('leaderboard.title')}</h1>
          <p className="text-gray-500">{t('leaderboard.subtitle')}</p>
        </div>
        
        {/* Вкладки */}
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'prompts'
                ? 'bg-gray-700 text-white shadow-md'
                : 'bg-[#f5f5f7] text-gray-600 hover:bg-gray-200'
            }`}
          >
            📝 {t('leaderboard.by_prompts')}
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${
              activeTab === 'likes'
                ? 'bg-gray-700 text-white shadow-md'
                : 'bg-[#f5f5f7] text-gray-600 hover:bg-gray-200'
            }`}
          >
            ❤️ {t('leaderboard.by_likes')}
          </button>
        </div>
        
        {/* Таблица лидеров */}
        <div className="bg-[#f5f5f7] rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-500 to-gray-700 text-white px-6 py-4">
            <h2 className="text-xl font-semibold text-center">{titleText}</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {currentData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {t('leaderboard.no_data')}
              </div>
            ) : (
              currentData.map((user) => (
                <Link 
                  href={`/profile/${user.user_id}`} 
                  key={user.user_id}
                  className="flex items-center justify-between px-6 py-4 bg-[#f5f5f7] hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* Ранг */}
                    <div className="w-12 text-center">
                      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm ${getRankStyles(user.rank)}`}>
                        {getRankBadge(user.rank)}
                      </span>
                    </div>
                    
                    {/* Аватар */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden shadow-sm">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-gray-500">
                          {user.username?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    {/* Имя и статистика */}
                    <div>
                      <div className="font-semibold text-gray-900">{user.username}</div>
                      <div className="text-sm text-gray-500">
                        {activeTab === 'prompts' 
                          ? t('leaderboard.prompts_count', { count: user.value })
                          : t('leaderboard.likes_received', { count: user.value })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Трофей для первого места */}
                  <div className="text-2xl">
                    {user.rank === 1 && '🏆'}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
        
        {/* Примечание */}
        <div className="mt-6 text-center text-sm text-gray-400">
          📊 {t('leaderboard.update_note')}
        </div>
      </div>
    </div>
  );
}