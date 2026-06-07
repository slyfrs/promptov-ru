'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { checkAuth } from '@/lib/auth';
import IconDisplay from '@/components/IconDisplay';

interface Stats {
  total_users: number;
  total_prompts: number;
  published_prompts: number;
  pending_prompts: number;
  private_prompts: number;
  rejected_prompts: number;
}

interface Prompt {
  id: number;
  title: string;
  content: string;
  description?: string;
  result_image_url?: string;
  theme?: string;
  status: string;
  user: { id: number; username: string; email?: string };
  tags?: { id: number; name: string; type: string; icon?: string }[];
  created_at: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_blocked: boolean;
  created_at: string;
}

interface Tag {
  id: number;
  name: string;      // для обратной совместимости
  name_ru: string;   // русское название
  name_en: string;   // английское название
  type: string;
  icon?: string;
}

interface Comment {
  id: number;
  content: string;
  is_approved: boolean;
  created_at: string;
  user: { id: number; username: string };
  prompt_id: number;
}

// Иконки для категорий
const CATEGORY_ICONS = [
  { value: 'BookOpen', label: '📖 Образование' },
  { value: 'PenTool', label: '✍️ Копирайтинг' },
  { value: 'Code2', label: '💻 Программирование' },
  { value: 'Palette', label: '🎨 Дизайн' },
  { value: 'Megaphone', label: '📢 Маркетинг' },
  { value: 'Lightbulb', label: '💡 Творчество' },
  { value: 'Heart', label: '❤️ HR и Резюме' },
  { value: 'Star', label: '⭐ Развлечения' },
  { value: 'Target', label: '🎯 Аналитика' },
  { value: 'Wrench', label: '🔧 Инструмент' },
  { value: 'FileText', label: '📄 Текст' },
  { value: 'Video', label: '🎬 Видео' },
  { value: 'Music', label: '🎵 Музыка' },
  { value: 'Camera', label: '📷 Фото' },
];

// Иконки для нейросетей
const NEURAL_ICONS = [
  { value: 'Bot', label: '🤖 Нейросеть' },
  { value: 'Sparkles', label: '✨ ChatGPT' },
  { value: 'Cpu', label: '🧠 DeepSeek' },
  { value: 'Brain', label: '🧠 Claude' },
  { value: 'Network', label: '🌐 Gemini' },
  { value: 'Zap', label: '⚡ Midjourney' },
  { value: 'Globe', label: '🌍 DALL-E' },
  { value: 'Database', label: '💾 Stable Diffusion' },
  { value: 'Cloud', label: '☁️ Cloud AI' },
  { value: 'Server', label: '🖥️ Local AI' },
  { value: 'Github', label: '🐙 Copilot' },
  { value: 'Twitter', label: '🐦 Grok' },
  { value: 'MessageSquare', label: '💬 Qwen' },
  { value: 'Eye', label: '👁️ Vision AI' },
  { value: 'Compass', label: '🧭 Perplexity' },
  { value: 'Layers', label: '📚 Llama' },
  { value: 'Box', label: '📦 Ollama' },
  { value: 'Container', label: '🐳 Container' },
];

const ALL_ICONS = [...CATEGORY_ICONS, ...NEURAL_ICONS];

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingPrompts, setPendingPrompts] = useState<Prompt[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Tag[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'moderation' | 'users' | 'neural' | 'categories' | 'comments'>('moderation');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagIcon, setNewTagIcon] = useState('Bot');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('BookOpen');
  
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagIcon, setEditTagIcon] = useState('');

  const [newTagNameRu, setNewTagNameRu] = useState('');
  const [newTagNameEn, setNewTagNameEn] = useState('');
  const [editTagNameRu, setEditTagNameRu] = useState('');
  const [editTagNameEn, setEditTagNameEn] = useState('');
  const [newCategoryNameRu, setNewCategoryNameRu] = useState('');
  const [newCategoryNameEn, setNewCategoryNameEn] = useState('');
  // Добавить состояние
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [userRole, setUserRole] = useState<string>('');
  const [hasAccess, setHasAccess] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    const checkAccess = async () => {
      const user = await checkAuth();
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Проверяем, есть ли у пользователя права доступа к админке
      if (user.role !== 'admin' && user.role !== 'moderator') {
        router.push('/dashboard');
        return;
      }
      
      setCurrentUserRole(user.role);
      setHasAccess(true);
      // loadData будет вызвана после установки currentUserRole
    };
    
    checkAccess();
  }, [router]);

  // Отдельный useEffect для загрузки данных после получения роли
  useEffect(() => {
    if (hasAccess && currentUserRole) {
      loadData();
    }
  }, [hasAccess, currentUserRole]);
  
  useEffect(() => {
    if (activeTab === 'comments') {
      loadPendingComments(commentsPage);
    }
  }, [activeTab, commentsPage]);


  const loadData = async () => {
    setLoading(true);
    try {
      // Для всех (модераторов и админов) загружаем промпты на модерации и комментарии
      const [pendingRes, commentsRes] = await Promise.all([
        fetch('/api/admin/prompts/pending', { credentials: 'include' }),
        fetch('/api/admin/comments/pending', { credentials: 'include' }),
      ]);
      
      const pendingData = await pendingRes.json();
      const commentsData = await commentsRes.json();
      
      if (pendingRes.ok) setPendingPrompts(pendingData.prompts || []);
      if (commentsRes.ok) setPendingComments(commentsData.comments || []);
      
      // Только для админов загружаем остальные данные
      if (currentUserRole === 'admin') {
        const [statsRes, usersRes, tagsRes, categoriesRes] = await Promise.all([
          fetch('/api/admin/stats', { credentials: 'include' }),
          fetch('/api/admin/users', { credentials: 'include' }),
          fetch('/api/admin/tags?type=ai_model', { credentials: 'include' }),
          fetch('/api/admin/categories', { credentials: 'include' }),
        ]);
        
        const statsData = await statsRes.json();
        const usersData = await usersRes.json();
        const tagsData = await tagsRes.json();
        const categoriesData = await categoriesRes.json();
        
        if (statsRes.ok) setStats(statsData.stats);
        if (usersRes.ok) setUsers(usersData.users || []);
        if (tagsRes.ok) setTags(tagsData.tags || []);
        if (categoriesRes.ok) setCategories(categoriesData.categories || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const adminDeletePrompt = async (id: number, title: string) => {
    if (!confirm(`Удалить промпт "${title}"? Это действие необратимо.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/prompts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка при удалении');
      }
    } catch (error) {
      alert('Ошибка при удалении');
    } finally {
      setActionLoading(false);
    }
  };

  const updateTag = async () => {
    if (!editingTag) return;
    if (!editTagNameRu.trim() || !editTagNameEn.trim()) {
      alert('Введите название на русском и английском');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name_ru: editTagNameRu.trim(), 
          name_en: editTagNameEn.trim(),
          icon: editTagIcon 
        }),
      });
      if (res.ok) {
        setEditingTag(null);
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка при обновлении');
      }
    } catch (error) {
      alert('Ошибка при обновлении');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteTag = async (id: number, name: string, type: 'neural' | 'category') => {
    const message = type === 'category'
      ? `⚠️ Удалить категорию "${name}"? Промпты с этой категорией не удалятся, но перестанут отображаться при фильтрации.\n\nПродолжить?`
      : `⚠️ Удалить нейросеть "${name}"? Связанные промпты потеряют этот тег. Сами промпты останутся.\n\nПродолжить?`;
    
    if (!confirm(message)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/tags/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка при удалении');
      }
    } catch (error) {
      alert('Ошибка при удалении');
    } finally {
      setActionLoading(false);
    }
  };

  const approvePrompt = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/prompts/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка при одобрении');
      }
    } catch (error) {
      alert('Ошибка при одобрении');
    } finally {
      setActionLoading(false);
    }
  };

  const rejectPrompt = async (id: number) => {
    if (!rejectReason.trim()) {
      alert('Укажите причину отклонения');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/prompts/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        setShowRejectModal(null);
        setRejectReason('');
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка при отклонении');
      }
    } catch (error) {
      alert('Ошибка при отклонении');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleBlockUser = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/block`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка');
      }
    } catch (error) {
      alert('Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  const makeAdmin = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/make-admin`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка');
      }
    } catch (error) {
      alert('Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  const removeAdmin = async (id: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/remove-admin`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка');
      }
    } catch (error) {
      alert('Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  // const addTag = async () => {
  //   if (!newTagName.trim()) {
  //     alert('Введите название нейросети');
  //     return;
  //   }
  //   setActionLoading(true);
  //   try {
  //     const res = await fetch('/api/admin/tags', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       credentials: 'include',
  //       body: JSON.stringify({ 
  //         name: newTagName.trim(), 
  //         type: 'ai_model',
  //         icon: newTagIcon 
  //       }),
  //     });
  //     if (res.ok) {
  //       setNewTagName('');
  //       setNewTagIcon('Bot');
  //       await loadData();
  //     } else {
  //       const error = await res.json();
  //       alert(error.error || 'Ошибка при добавлении');
  //     }
  //   } catch (error) {
  //     alert('Ошибка при добавлении');
  //   } finally {
  //     setActionLoading(false);
  //   }
  // };

  const addTag = async () => {
    if (!newTagNameRu.trim() || !newTagNameEn.trim()) {
      alert('Введите название на русском и английском');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name_ru: newTagNameRu.trim(), 
          name_en: newTagNameEn.trim(),
          type: 'ai_model',
          icon: newTagIcon 
        }),
      });
      if (res.ok) {
        setNewTagNameRu('');
        setNewTagNameEn('');
        setNewTagIcon('Bot');
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка при добавлении');
      }
    } catch (error) {
      alert('Ошибка при добавлении');
    } finally {
      setActionLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategoryNameRu.trim() || !newCategoryNameEn.trim()) {
      alert('Введите название на русском и английском');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          name_ru: newCategoryNameRu.trim(), 
          name_en: newCategoryNameEn.trim(),
          type: 'category',
          icon: newCategoryIcon 
        }),
      });
      if (res.ok) {
        setNewCategoryNameRu('');
        setNewCategoryNameEn('');
        setNewCategoryIcon('BookOpen');
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка при добавлении');
      }
    } catch (error) {
      alert('Ошибка при добавлении');
    } finally {
      setActionLoading(false);
    }
  };

   // Загрузка комментариев на модерации
  const loadPendingComments = async (pageNum: number = 1) => {
    try {
      const response = await fetch(`/api/admin/comments/pending?page=${pageNum}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setPendingComments(data.comments || []);
        setCommentsTotalPages(data.pages || 1);
      }
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
    }
  };

  const approveComment = async (commentId: number) => {
    try {
      const response = await fetch(`/api/admin/comments/${commentId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        await loadPendingComments(commentsPage);
        await loadData(); // обновляем статистику
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка при одобрении');
      }
    } catch (error) {
      alert('Ошибка при одобрении');
    }
  };

  const adminDeleteComment = async (commentId: number) => {
    if (!confirm('Удалить комментарий?')) return;
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        await loadPendingComments(commentsPage);
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка при удалении');
      }
    } catch (error) {
      alert('Ошибка при удалении');
    }
  };

  const makeModerator = async (id: number) => {
    if (!confirm('Назначить пользователя модератором?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/make-moderator`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка');
      }
    } catch (error) {
      alert('Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  const removeModerator = async (id: number) => {
    if (!confirm('Снять права модератора?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/remove-moderator`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        await loadData();
      } else {
        const error = await res.json();
        alert(error.error || 'Ошибка');
      }
    } catch (error) {
      alert('Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Загрузка...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Проверка прав доступа...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {currentUserRole === 'admin' ? 'Админ-панель' : 'Модерация'}
        </h1>

        {/* Вкладки */}
        <div className="flex gap-2 mb-6 border-b flex-wrap">
          {/* Модерация промптов — видят все модераторы и админы */}
          {(currentUserRole === 'admin' || currentUserRole === 'moderator') && (
          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'moderation' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📝 Модерация {pendingPrompts.length > 0 && `(${pendingPrompts.length})`}
          </button>
           )}
          {/* Модерация промптов — видят все модераторы и админы */}
          {(currentUserRole === 'admin' || currentUserRole === 'moderator') && (
          <button
              onClick={() => setActiveTab('comments')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'comments' 
                  ? 'text-purple-600 border-b-2 border-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💬 Комментарии ({pendingComments.length > 0 ? pendingComments.length : '0'})
          </button>
          )}
          {currentUserRole === 'admin' && (
            <>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'users' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            👥 Пользователи ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('neural')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'neural' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🧠 Нейросети ({tags.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'categories' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📂 Категории ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'stats' 
                ? 'text-purple-600 border-b-2 border-purple-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📊 Статистика
          </button>
          </>
        )}

        </div>

        {/* Статистика */}
        {activeTab === 'stats' && stats && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Общая статистика</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total_users}</div>
                <div className="text-gray-600 text-sm">Пользователей</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.total_prompts}</div>
                <div className="text-gray-600 text-sm">Всего промптов</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending_prompts}</div>
                <div className="text-gray-600 text-sm">На модерации</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.published_prompts}</div>
                <div className="text-gray-600 text-sm">Опубликовано</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{stats.private_prompts}</div>
                <div className="text-gray-600 text-sm">Черновики</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.rejected_prompts}</div>
                <div className="text-gray-600 text-sm">Отклонено</div>
              </div>
            </div>
          </div>
        )}

        {/* Модерация */}
        {activeTab === 'moderation' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Промпты на модерации</h2>
            {pendingPrompts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">✅ Нет промптов на модерацию</p>
            ) : (
              <div className="space-y-6">
                {pendingPrompts.map((prompt) => (
                  <div key={prompt.id} className="border rounded-lg p-4 hover:shadow transition-shadow">
                    <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-semibold text-lg">{prompt.title}</h3>
                          {prompt.theme && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span>📂</span>
                              <span>{prompt.theme}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 text-xs text-gray-400">
                          <span>👤 {prompt.user?.username || 'Неизвестен'}</span>
                          <span>📅 {new Date(prompt.created_at).toLocaleDateString('ru-RU')}</span>
                          <span>🆔 ID: {prompt.id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Бейджи нейросетей */}
                    {prompt.tags && prompt.tags.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1">
                          {prompt.tags.map((tag) => (
                            <span key={tag.id} className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <IconDisplay name={tag.icon || 'Bot'} size={12} />
                              <span>{tag.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Текст промпта */}
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-500 mb-1">📄 Текст промпта:</div>
                      <div className="bg-gray-900 text-gray-100 p-3 rounded text-sm font-mono overflow-x-auto max-h-48 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{prompt.content}</pre>
                      </div>
                    </div>

                    {/* Результат (описание) */}
                    {prompt.description && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-gray-500 mb-1">📝 Результат:</div>
                        <p className="text-gray-700 text-sm bg-gray-50 p-2 rounded">
                          {prompt.description}
                        </p>
                      </div>
                    )}

                    {/* Пример результата (картинка) — ДОБАВИТЬ ЭТОТ БЛОК */}
                    {prompt.result_image_url && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-gray-500 mb-1">📷 Пример результата:</div>
                        <img 
                          src={prompt.result_image_url}
                          alt="Пример результата"
                          className="max-w-full max-h-48 rounded-lg border object-contain bg-gray-50"
                        />
                      </div>
                    )}

                    {/* Кнопки действий */}
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <button
                        onClick={() => approvePrompt(prompt.id)}
                        disabled={actionLoading}
                        className="bg-green-500 text-white px-4 py-1.5 rounded text-sm hover:bg-green-600 disabled:opacity-50 transition-colors"
                      >
                        ✅ Одобрить
                      </button>
                      <button
                        onClick={() => setShowRejectModal(prompt.id)}
                        disabled={actionLoading}
                        className="bg-red-500 text-white px-4 py-1.5 rounded text-sm hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        ❌ Отклонить
                      </button>
                      <button
                        onClick={() => adminDeletePrompt(prompt.id, prompt.title)}
                        disabled={actionLoading}
                        className="bg-gray-600 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Вкладка: Пользователи */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Все пользователи</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">ID</th>
                    <th className="px-4 py-2 text-left">Имя</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Роль</th>
                    <th className="px-4 py-2 text-left">Статус</th>
                    <th className="px-4 py-2 text-left">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{user.id}</td>
                      <td className="px-4 py-2 font-medium">{user.username}</td>
                      <td className="px-4 py-2 text-gray-600">{user.email}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : user.role === 'moderator'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role === 'admin' ? 'Админ' : user.role === 'moderator' ? 'Модератор' : 'Пользователь'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.is_blocked 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {user.is_blocked ? 'Заблокирован' : 'Активен'}
                        </span>
                      </td>
                      <td className="px-4 py-2 flex gap-2 flex-wrap">
                        {/* Блокировка/Разблокировка */}
                        {user.id !== 1 && (
                        <button
                          onClick={() => toggleBlockUser(user.id)}
                          disabled={actionLoading}
                          className={`px-2 py-1 rounded text-xs text-white ${
                            user.is_blocked 
                              ? 'bg-green-500 hover:bg-green-600' 
                              : 'bg-red-500 hover:bg-red-600'
                          } disabled:opacity-50`}
                        >
                          {user.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                        )}
                        {/* Назначить модератором (для обычных пользователей) */}
                        {user.id !== 1 && user.role === 'user' && (
                          <button
                            onClick={() => makeModerator(user.id)}
                            disabled={actionLoading}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                          >
                            Назначить модератором
                          </button>
                        )}
                        
                        {/* Снять модератора (для модераторов, но не для админов) */}
                        {user.id !== 1 && user.role === 'moderator' && (
                          <button
                            onClick={() => removeModerator(user.id)}
                            disabled={actionLoading}
                            className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600 disabled:opacity-50"
                          >
                            Снять модератора
                          </button>
                        )}
                        
                        {/* Назначить админом (только для обычных пользователей и модераторов) */}
                        {user.role !== 'admin' && user.id !== 1 && (
                          <button
                            onClick={() => makeAdmin(user.id)}
                            disabled={actionLoading}
                            className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600 disabled:opacity-50"
                          >
                            Назначить админом
                          </button>
                        )}
                        
                        {/* Снять админа (для админов, кроме первого) */}
                        {user.role === 'admin' && user.id !== 1 && (
                          <button
                            onClick={() => removeAdmin(user.id)}
                            disabled={actionLoading}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50"
                          >
                            Снять админа
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Вкладка: Нейросети */}
        {activeTab === 'neural' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Управление нейросетями</h2>
            
            {/* Форма добавления */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <input
                type="text"
                value={newTagNameRu}
                onChange={(e) => setNewTagNameRu(e.target.value)}
                placeholder="Название на русском"
                className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                value={newTagNameEn}
                onChange={(e) => setNewTagNameEn(e.target.value)}
                placeholder="Название на английском"
                className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
              />
              <select
                value={newTagIcon}
                onChange={(e) => setNewTagIcon(e.target.value)}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
              >
                {NEURAL_ICONS.map((icon) => (
                  <option key={icon.value} value={icon.value}>
                    {icon.label}
                  </option>
                ))}
              </select>
              <button
                onClick={addTag}
                disabled={actionLoading || !newTagNameRu.trim() || !newTagNameEn.trim()}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                + Добавить
              </button>
            </div>
            
            {/* Список нейросетей */}
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <p className="text-gray-500 text-center w-full py-8">Нет нейросетей. Добавьте первую!</p>
              ) : (
                tags.map((tag) => (
                  <div key={tag.id} className="bg-gray-100 rounded-full px-3 py-1 flex items-center gap-2">
                    <IconDisplay name={tag.icon || 'Bot'} size={16} className="text-gray-600" />
                    <span className="text-sm font-medium">{tag.name_ru}</span>
                    <span className="text-xs text-gray-400">/{tag.name_en}</span>
                    <button
                      onClick={() => {
                        setEditingTag(tag);
                        setEditTagNameRu(tag.name_ru);
                        setEditTagNameEn(tag.name_en);
                        setEditTagIcon(tag.icon || 'Bot');
                      }}
                      className="text-blue-500 hover:text-blue-700 text-sm ml-1"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteTag(tag.id, tag.name_ru, 'neural')}
                      disabled={actionLoading}
                      className="text-red-500 hover:text-red-700 text-lg leading-none disabled:opacity-50"
                      title="Удалить"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              💡 Нейросети используются как теги для промптов. Пользователи смогут выбирать их при создании.
            </div>
          </div>
        )}

        {/* Вкладка: Категории */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Управление категориями</h2>
            
            {/* Форма добавления */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <input
                type="text"
                value={newCategoryNameRu}
                onChange={(e) => setNewCategoryNameRu(e.target.value)}
                placeholder="Название на русском"
                className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                value={newCategoryNameEn}
                onChange={(e) => setNewCategoryNameEn(e.target.value)}
                placeholder="Название на английском"
                className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
              />
              <select
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
              >
                {CATEGORY_ICONS.map((icon) => (
                  <option key={icon.value} value={icon.value}>
                    {icon.label}
                  </option>
                ))}
              </select>
              <button
                onClick={addCategory}
                disabled={actionLoading || !newCategoryNameRu.trim() || !newCategoryNameEn.trim()}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                + Добавить
              </button>
            </div>
            
            {/* Список категорий */}
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 ? (
                <p className="text-gray-500 text-center w-full py-8">Нет категорий. Добавьте первую!</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="bg-gray-100 rounded-full px-3 py-1 flex items-center gap-2">
                    <IconDisplay name={cat.icon || 'BookOpen'} size={16} className="text-gray-600" />
                    <span className="text-sm font-medium">{cat.name_ru}</span>
                    <span className="text-xs text-gray-400">/{cat.name_en}</span>
                    <button
                      onClick={() => {
                        setEditingTag(cat);
                        setEditTagNameRu(cat.name_ru);
                        setEditTagNameEn(cat.name_en);
                        setEditTagIcon(cat.icon || 'BookOpen');
                      }}
                      className="text-blue-500 hover:text-blue-700 text-sm ml-1"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteTag(cat.id, cat.name_ru, 'category')}
                      disabled={actionLoading}
                      className="text-red-500 hover:text-red-700 text-lg leading-none disabled:opacity-50"
                      title="Удалить"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              💡 Категории используются для тематической группировки промптов на главной странице.
            </div>
          </div>
        )}

        {/* Вкладка: Модерация комментариев */}
        {activeTab === 'comments' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Комментарии на модерации</h2>
            {pendingComments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">✅ Нет комментариев на модерацию</p>
            ) : (
              <>
                <div className="space-y-4">
                  {pendingComments.map((comment) => (
                    <div key={comment.id} className="border rounded-lg p-4 hover:shadow transition-shadow">
                      <div className="flex justify-between items-start flex-wrap gap-3">
                        <div className="flex-1">
                          {/* Автор и дата */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="font-semibold text-gray-900">{comment.user?.username || 'Неизвестен'}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.created_at).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                          
                          {/* Ссылка на промпт */}
                          <Link 
                            href={`/prompt/${comment.prompt_id}`}
                            target="_blank"
                            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mb-2"
                          >
                            📄 Перейти к промпту →
                          </Link>
                          
                          {/* Текст комментария */}
                          <p className="text-gray-700 text-sm mt-1">{comment.content}</p>
                        </div>
                        
                        {/* Кнопки действий */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveComment(comment.id)}
                            disabled={actionLoading}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                          >
                            ✅ Одобрить
                          </button>
                          <button
                            onClick={() => adminDeleteComment(comment.id)}
                            disabled={actionLoading}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 disabled:opacity-50"
                          >
                            🗑️ Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Пагинация */}
                {commentsTotalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => setCommentsPage(p => Math.max(1, p - 1))}
                      disabled={commentsPage === 1}
                      className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      ← Назад
                    </button>
                    <span className="px-3 py-1 text-gray-600">
                      Страница {commentsPage} из {commentsTotalPages}
                    </span>
                    <button
                      onClick={() => setCommentsPage(p => Math.min(commentsTotalPages, p + 1))}
                      disabled={commentsPage === commentsTotalPages}
                      className="px-3 py-1 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      Вперёд →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        
      </div>

      {/* Модальное окно для редактирования тега */}
      {editingTag !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Редактирование</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название (русский)</label>
                <input
                  type="text"
                  value={editTagNameRu}
                  onChange={(e) => setEditTagNameRu(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название (английский)</label>
                <input
                  type="text"
                  value={editTagNameEn}
                  onChange={(e) => setEditTagNameEn(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Иконка</label>
                <select
                  value={editTagIcon}
                  onChange={(e) => setEditTagIcon(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                >
                  {ALL_ICONS.map((icon) => (
                    <option key={icon.value} value={icon.value}>
                      {icon.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setEditingTag(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={updateTag}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для причины отклонения */}
      {showRejectModal !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Причина отклонения</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border rounded-lg p-2 mb-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
              placeholder="Укажите причину, почему промпт отклонён..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={() => rejectPrompt(showRejectModal)}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}