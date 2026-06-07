// frontend/lib/api.ts
import { Prompt } from '@/types/prompt';
import { Comment } from '@/types/comment';
import { Tag } from '@/types/tag';
import { User } from '@/types/user';
import { Notification } from '@/types/notification';
import { 
  PromptsResponse, 
  CommentsResponse, 
  TagsResponse, 
  LikeResponse,
  LeaderboardResponse,
  LeaderboardUser,
  NotificationResponse
} from '@/types/api';
// frontend/lib/api.ts
const API_URL = '/api';

// export interface Prompt {
//   id: number;
//   title: string;
//   content: string;
//   description: string;
//   example_usage: string;
//   status: 'private' | 'pending' | 'published' | 'rejected';
//   theme: string;
//   theme_id?: number;
//   theme_name?: string;
//   result_image_url?: string;
//   custom_image_url: string;
//   version: number;
//   parent_prompt_id?: number;
//   tags: Tag[];
//   likes_count: number;
//   ratings_count: number;
//   comments_count?: number;
//   user_liked?: boolean;
//   user?: {
//     id: number;
//     username: string;
//     avatar_url?: string;
//   };
//   created_at: string;
//   published_at: string;
//   updated_at: string;
// }

// export interface Tag {
//   id: number;
//   name: string;      // локализованное имя
//   name_ru?: string;  // русское имя
//   name_en?: string;  // английское имя
//   type: string;
//   icon?: string;  // ← добавить
// }

// export interface Comment {
//   id: number;
//   content: string;
//   created_at: string;
//   user: {
//     id: number;
//     username: string;
//   };
// }

// ==================== ЛАЙКИ ====================

// Поставить/убрать лайк

// Реэкспортируем типы для использования в других файлах
export type { Prompt, Tag, Comment, LikeResponse, PromptsResponse, CommentsResponse };

export async function likePrompt(promptId: number): Promise<LikeResponse> {
  const response = await fetch(`${API_URL}/prompts/${promptId}/like`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

// Получить статус лайка
// export async function getLikeStatus(promptId: number): Promise<{ liked: boolean; likes_count: number }> {
//   const response = await fetch(`${API_URL}/prompts/${promptId}/liked`, {
//     credentials: 'include',
//   });
//   const data = await response.json();
//   return data;
// }

// Получить избранное (лайкнутые промпты)
export async function getFavorites(
  page: number = 1,
  sort: string = 'newest',
  search: string = '',
  neuralFilter: string = '',
  lang: string = 'ru'  // ← добавить lang
): Promise<PromptsResponse> {
  let url = `${API_URL}/my/favorites/filtered?page=${page}&per_page=12&sort=${sort}&lang=${lang}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (neuralFilter) url += `&neural=${encodeURIComponent(neuralFilter)}`;
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

// ==================== ПРОФИЛЬ ====================

// Получить публичный профиль
export async function getPublicProfile(userId: number): Promise<{ user: User; stats: { prompts_count: number; total_likes: number } }> {
  const response = await fetch(`${API_URL}/profile/${userId}`, {
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

// Получить промпты пользователя (для публичного профиля)
export async function getUserPrompts(
  userId: number,
  page: number = 1,
  sort: string = 'newest'
): Promise<{ prompts: Prompt[]; total: number; pages: number }> {
  const response = await fetch(`${API_URL}/profile/${userId}/prompts?page=${page}&sort=${sort}`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data;
}

// Получить свой профиль (приватный)
export async function getMyProfile(): Promise<User> {
  const response = await fetch(`${API_URL}/profile/me`, {
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data.user;
}

// Обновить свой профиль
export async function updateMyProfile(profileData: Partial<User>): Promise<User> {
  const response = await fetch(`${API_URL}/profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(profileData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data.user;
}

// Сменить пароль
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const response = await fetch(`${API_URL}/profile/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
}

// ==================== ПРОМПТЫ ====================
// Получить публичные промпты (главная страница)

export async function getPublicPrompts(
  page: number = 1, 
  sort: string = 'newest', 
  search: string = '',
  neuralFilter: string = '',
  themeFilter: string = '',
  lang: string = 'ru'
): Promise<PromptsResponse> {
  let url = `${API_URL}/prompts?page=${page}&per_page=12&sort=${sort}&search=${encodeURIComponent(search)}&lang=${lang}`;
  
  if (neuralFilter) {
    url += `&tag_names=${encodeURIComponent(neuralFilter)}`;
  }
  if (themeFilter) {
    url += `&theme=${encodeURIComponent(themeFilter)}`;
  }
  
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();
  return data;
}

export async function getPrompt(id: number, lang: string = 'ru'): Promise<Prompt> {
  const response = await fetch(`${API_URL}/prompts/${id}?lang=${lang}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Промпт не найден');
  }
  const data = await response.json();
  return data.prompt;
}

export async function getMyPrompts(
  page: number = 1,
  status: string = 'all',
  sort: string = 'newest',
  lang: string = 'ru'  // ← добавить lang
): Promise<PromptsResponse> {
  let url = `${API_URL}/my/prompts/filtered?page=${page}&per_page=12&sort=${sort}&lang=${lang}`;
  if (status !== 'all') url += `&status=${status}`;
  const response = await fetch(url, { credentials: 'include' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

// Создать промпт
export async function createPrompt(formData: FormData): Promise<Prompt> {
  const response = await fetch(`${API_URL}/prompts`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data.prompt;
}

// Обновить промпт
export async function updatePrompt(id: number, formData: FormData): Promise<Prompt> {
  const response = await fetch(`${API_URL}/prompts/${id}`, {
    method: 'PUT',
    credentials: 'include',
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data.prompt;
}

// Опубликовать промпт (отправить на модерацию)
export async function publishPrompt(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/prompts/${id}/publish`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
}

// Удалить промпт
export async function deletePrompt(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/prompts/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
}

// ==================== КОММЕНТАРИИ ====================

// Получить комментарии с пагинацией
export async function getComments(
  promptId: number, 
  page: number = 1, 
  perPage: number = 10
): Promise<CommentsResponse> {
  const response = await fetch(`${API_URL}/prompts/${promptId}/comments?page=${page}&per_page=${perPage}`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data;
}

// Удалить комментарий (админ или автор)
export async function deleteComment(commentId: number): Promise<void> {
  const response = await fetch(`${API_URL}/comments/${commentId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
}

// Админ: получить комментарии на модерации
export async function getPendingComments(page: number = 1): Promise<{ comments: Comment[]; total: number; pages: number }> {
  const response = await fetch(`${API_URL}/admin/comments/pending?page=${page}`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data;
}

// Админ: одобрить комментарий
export async function approveComment(commentId: number): Promise<void> {
  const response = await fetch(`${API_URL}/admin/comments/${commentId}/approve`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
}

export async function addComment(promptId: number, content: string): Promise<Comment> {
  const response = await fetch(`${API_URL}/prompts/${promptId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ content }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data.comment;
}



// ==================== ТЕГИ И КАТЕГОРИИ ====================
// Получить все теги (нейросети) с учётом языка
export async function getAllTags(lang: string = 'ru'): Promise<Tag[]> {
  const response = await fetch(`${API_URL}/tags?type=ai_model&lang=${lang}`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data.tags || [];
}

// Получить все категории с учётом языка
export async function getCategories(lang: string = 'ru'): Promise<Tag[]> {
  const response = await fetch(`${API_URL}/categories?lang=${lang}`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data.categories || [];
}

// Получить публичные категории (для главной)
export async function getPublicCategories(lang: string = 'ru'): Promise<Tag[]> {
  const response = await fetch(`${API_URL}/categories?lang=${lang}`, {
    credentials: 'include',
  });
  const data = await response.json();
  return data.categories || [];
}