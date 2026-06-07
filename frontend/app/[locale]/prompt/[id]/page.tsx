'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getPrompt, getComments, addComment, deleteComment, Prompt, Comment } from '@/lib/api';
import { checkAuth, User } from '@/lib/auth';
import LikeButton from '@/components/LikeButton';
import { useToast } from '@/components/Toast';
import IconDisplay from '@/components/IconDisplay';

export default function PromptPage() {
  const locale = useLocale();
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);
  
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLiked, setUserLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [perPage] = useState(10);
  
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [promptData, userData] = await Promise.all([
          getPrompt(id, locale),
          checkAuth(),
        ]);
        setPrompt(promptData);
        setUser(userData);
        setUserLiked(promptData.user_liked || false);
      } catch (err: any) {
        console.error('Ошибка загрузки:', err);
        setError(err.message || t('prompt.load_error'));
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, t, locale]);

  useEffect(() => {
    const loadComments = async () => {
      try {
        const data = await getComments(id, commentsPage, perPage);
        setComments(data.comments || []);
        setCommentsTotal(data.total || 0);
        setCommentsTotalPages(data.pages || 1);
      } catch (error) {
        console.error('Ошибка загрузки комментариев:', error);
      }
    };
    loadComments();
  }, [id, commentsPage, perPage]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    setCommentSuccess(null);
    
    if (!user) {
      setCommentError(t('comments.login_to_comment'));
      return;
    }
    if (!newComment.trim()) {
      setCommentError(t('comments.error_empty'));
      return;
    }
    if (newComment.length < 2) {
      setCommentError(t('comments.error_min_length'));
      return;
    }
    if (newComment.length > 2000) {
      setCommentError(t('comments.error_max_length'));
      return;
    }
    
    setSubmitting(true);
    try {
      await addComment(id, newComment);
      setCommentsPage(1);
      setNewComment('');
      const data = await getComments(id, 1, perPage);
      setComments(data.comments || []);
      setCommentsTotal(data.total || 0);
      setCommentsTotalPages(data.pages || 1);
      setCommentSuccess(t('comments.moderation_sent'));
      setTimeout(() => setCommentSuccess(null), 3000);
    } catch (err: any) {
      setCommentError(err.message || t('comments.error_general'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm(t('comments.delete_confirm'))) {
      return;
    }
    try {
      await deleteComment(commentId);
      const data = await getComments(id, commentsPage, perPage);
      setComments(data.comments || []);
      setCommentsTotal(data.total || 0);
      setCommentsTotalPages(data.pages || 1);
    } catch (error) {
      showToast(t('comments.delete_error'), 'error');
    }
  };

  const getThemeGradient = (theme_id: number): string => {
    const gradients: Record<number, string> = {
      1: 'from-blue-100 to-indigo-200',
      2: 'from-purple-100 to-pink-200',
      3: 'from-pink-100 to-rose-200',
      4: 'from-green-100 to-emerald-200',
      5: 'from-yellow-100 to-amber-200',
      6: 'from-orange-100 to-red-200',
      7: 'from-teal-100 to-cyan-200',
      8: 'from-indigo-100 to-purple-200',
      9: 'from-cyan-100 to-blue-200',
      10: 'from-red-100 to-rose-200',
    };
    return gradients[theme_id] || 'from-gray-100 to-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="text-center py-12">{t('common.loading')}</div>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-md mx-auto bg-[#f5f5f7] rounded-2xl p-8 text-center mt-12">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('prompt.not_found_title')}</h1>
          <p className="text-gray-600 mb-6">
            {error || t('prompt.not_found_message')}
          </p>
          <Link href="/" className="text-blue-600 hover:underline">
            {t('prompt.back_to_home')}
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user && prompt.user?.id === user.id;
  const isAdmin = user?.role === 'admin';
  const gradientClass = getThemeGradient(prompt.theme_id || 1);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Основной контент */}
        <div className="bg-[#f5f5f7] rounded-2xl p-6 mb-6">
          {/* Верхняя панель: копирование слева, лайк справа */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => {
                navigator.clipboard.writeText(prompt.content);
                showToast(t('prompt.copy_success'), 'success');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
              title={t('prompt.copy_title')}
            >
              <span className="text-lg">📋</span>
              <span className="text-sm font-medium text-gray-700">{t('prompt.copy_button')}</span>
            </button>
            
            <LikeButton 
              promptId={prompt.id} 
              initialLiked={userLiked}
              initialLikesCount={prompt.likes_count || 0}
              onLikeChange={(liked, likesCount) => {
                setUserLiked(liked);
                setPrompt(prev => prev ? { ...prev, likes_count: likesCount } : null);
              }}
            />
          </div>

          {/* Бейдж категории по центру */}
          {prompt.theme_name && (
            <div className="flex flex-col items-center mb-6">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-md mb-3`}>
                <IconDisplay name={prompt.theme_icon || 'Tag'} size={36} />
              </div>
              <span className="px-4 py-1.5 rounded-full bg-black/5 text-sm font-semibold text-gray-800">
                {prompt.theme_name}
              </span>
            </div>
          )}
          
          {/* Заголовок по центру */}
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">
            {prompt.title}
          </h1>

          {/* Теги (нейросети) по центру */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {prompt.tags?.map((tag) => (
              <span key={tag.id} className="bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 transition-all duration-200 inline-flex items-center gap-1">
                <IconDisplay name={tag.icon || 'Bot'} size={12} />
                <span>{locale === 'en' ? (tag.name_en || tag.name) : (tag.name_ru || tag.name)}</span>
              </span>
            ))}
          </div>

          {/* Текст промпта по центру */}
          <div className="mb-8">
            <div className="bg-gray-900 text-gray-100 p-5 rounded-xl font-mono text-sm overflow-x-auto text-left">
              <pre className="whitespace-pre-wrap">{prompt.content}</pre>
            </div>
          </div>

          {/* Результат (описание) */}
          {prompt.description && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gray-300"></div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('prompt.result_label')}</h2>
                <div className="h-px flex-1 bg-gray-300"></div>
              </div>
              <div className="bg-white/50 rounded-xl p-5 text-center">
                <p className="text-gray-700 whitespace-pre-wrap break-words">
                  {prompt.description}
                </p>
              </div>
            </div>
          )}

          {/* Изображение результата */}
          {prompt.result_image_url && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gray-300"></div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('prompt.result_image_label')}</h2>
                <div className="h-px flex-1 bg-gray-300"></div>
              </div>
              <div className="bg-white/50 rounded-xl p-5 text-center">
                <img 
                  src={prompt.result_image_url}
                  alt={t('prompt.result_image_alt')}
                  className="max-w-full max-h-96 rounded-xl border object-contain mx-auto"
                />
              </div>
            </div>
          )}
          
          {/* Админская кнопка удаления (если нужно) */}
          {isAdmin && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => {
                  if (confirm(t('prompt.delete_confirm', { title: prompt.title }))) {
                    fetch(`/api/admin/prompts/${prompt.id}`, {
                      method: 'DELETE',
                      credentials: 'include',
                    }).then(() => router.push('/'));
                  }
                }}
                className="text-red-400 hover:text-red-600 transition-colors text-sm flex items-center gap-1"
              >
                🗑️ {t('prompt.delete_title')}
              </button>
            </div>
          )}
        </div>

        {/* Блок автора */}
        <div className="bg-[#f5f5f7] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-center gap-4">
            {prompt.user?.avatar_url ? (
              <img 
                src={prompt.user.avatar_url}
                alt={prompt.user.username}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                {prompt.user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <Link href={`/profile/${prompt.user?.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-lg">
                {prompt.user?.username || t('common.anonymous')}
              </Link>
              <div className="text-sm text-gray-500">
                {t('prompt.published_on')} {new Date(prompt.published_at).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US')}
              </div>
            </div>
          </div>
        </div>

        {/* Комментарии */}
        <div className="bg-[#f5f5f7] rounded-2xl p-6" id="comments-section">
          <h2 className="text-xl font-semibold text-gray-900 mb-5 text-center">{t('comments.title')} ({commentsTotal})</h2>
          
          {commentError && (
            <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span className="text-red-500">⚠️</span>
                  <p className="text-sm text-red-700">{commentError}</p>
                </div>
                <button onClick={() => setCommentError(null)} className="text-red-400 hover:text-red-600">
                  ×
                </button>
              </div>
            </div>
          )}
          
          {commentSuccess && (
            <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span className="text-green-500">✅</span>
                  <p className="text-sm text-green-700">{commentSuccess}</p>
                </div>
                <button onClick={() => setCommentSuccess(null)} className="text-green-400 hover:text-green-600">
                  ×
                </button>
              </div>
            </div>
          )}
          
          {user ? (
            <form onSubmit={handleAddComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  if (commentError) setCommentError(null);
                }}
                placeholder={t('comments.write_comment_placeholder')}
                rows={3}
                maxLength={2000}
                className="w-full px-4 py-3 bg-white border-none rounded-xl focus:ring-2 focus:ring-gray-400 transition-colors text-gray-800 placeholder-gray-400"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-400">{newComment.length}/2000 {t('comments.characters')}</p>
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="bg-gray-900 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {submitting ? t('comments.sending') : t('comments.send_button')}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-500 mb-6 text-center py-4">
              <Link href="/login" className="text-blue-600 hover:underline">{t('comments.login_to_comment')}</Link>
            </p>
          )}
          
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">{t('comments.no_comments')}</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-white rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Link 
                      href={`/profile/${comment.user.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {comment.user.username}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US')}
                      </span>
                      {(isAdmin || comment.user.id === user?.id) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title={t('comments.delete_title')}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))
            )}
          </div>
          
          {commentsTotalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setCommentsPage(p => Math.max(1, p - 1))}
                disabled={commentsPage === 1}
                className="px-4 py-2 bg-gray-200 rounded-xl text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                ← {t('common.back')}
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                {t('common.page')} {commentsPage} {t('common.of')} {commentsTotalPages}
              </span>
              <button
                onClick={() => setCommentsPage(p => Math.min(commentsTotalPages, p + 1))}
                disabled={commentsPage === commentsTotalPages}
                className="px-4 py-2 bg-gray-200 rounded-xl text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                {t('common.next')} →
              </button>
            </div>
          )}
        </div>
      </div>
      {ToastComponent}
    </div>
  );
}