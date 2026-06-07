'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { checkAuth } from '@/lib/auth';

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const t = useTranslations();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/notifications?page=${page}&per_page=20`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications || []);
        setTotalPages(data.pages || 1);
      }
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
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
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  useEffect(() => {
    checkAuth().then(user => {
      if (!user) window.location.href = '/login';
    });
    loadNotifications();
  }, [page]);

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return t('notifications.time_ago.just_now');
    if (diff < 3600) return t('notifications.time_ago.minutes_ago', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('notifications.time_ago.hours_ago', { count: Math.floor(diff / 3600) });
    return t('notifications.time_ago.days_ago', { count: Math.floor(diff / 86400) });
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('notifications.page_title')}</h1>

        {loading ? (
          <div className="text-center py-12">{t('common.loading')}</div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔕</div>
            <p className="text-gray-500">{t('notifications.no_notifications')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`bg-[#f5f5f7] rounded-lg shadow p-4 transition-colors ${
                  !notif.is_read ? 'border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 cursor-pointer" onClick={() => markAsRead(notif.id)}>
                    <h3 className="font-semibold text-gray-900">{notif.title}</h3>
                    <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">{getTimeAgo(notif.created_at)}</p>
                  </div>
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                    title={t('notifications.delete_title')}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              ←
            </button>
            <span className="px-3 py-1 text-gray-600">
              {t('common.page')} {page} {t('common.of')} {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}