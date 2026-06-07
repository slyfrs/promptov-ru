// frontend/app/[locale]/about/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { checkAuth, User } from '@/lib/auth';

interface PageData {
  id: number;
  slug: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function AboutPage() {
  const t = useTranslations();
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pageRes, userData] = await Promise.all([
          fetch('/api/pages/about'),
          checkAuth(),
        ]);
        
        const pageData = await pageRes.json();
        setPage(pageData.page);
        setEditTitle(pageData.page.title);
        setEditContent(pageData.page.content);
        setUser(userData);
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/pages/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setPage(data.page);
        setIsEditing(false);
        setMessage(t('about.save_success'));
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(t('about.save_error'));
      }
    } catch (error) {
      setMessage(t('about.save_error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 text-center py-12">{t('common.loading')}</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex-1 text-center py-12">{t('about.not_found')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow p-8">
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">{message}</p>
            </div>
          )}
          
          {isEditing && user?.role === 'admin' ? (
            <div className="space-y-4">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-3xl font-bold border rounded-lg px-4 py-2"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={20}
                className="w-full font-mono text-sm border rounded-lg px-4 py-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? t('about.saving_button') : t('about.save_button')}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  {t('about.cancel_button')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-6">
                <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    ✏️ {t('about.edit_button')}
                  </button>
                )}
              </div>
              
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
              
              <div className="mt-6 text-xs text-gray-400">
                {t('about.last_updated')} {new Date(page.updated_at).toLocaleDateString('ru-RU')}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}