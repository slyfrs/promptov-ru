// frontend/lib/api-server.ts

const API_URL = 'http://backend:5000';

export interface Prompt {
  id: number;
  title: string;
  content: string;
  description: string;
  status: string;
  theme: string;
  theme_name?: string;
  tags: { id: number; name: string; name_ru?: string; name_en?: string; type: string; icon?: string }[];
  likes_count: number;
  comments_count?: number;
  user?: { id: number; username: string; avatar_url?: string };
  created_at: string;
  published_at: string;
}

// Тип для тега с конкретными значениями type
export interface Tag {
  id: number;
  name: string;
  name_ru: string;
  name_en: string;
  type: 'category' | 'ai_model';  // ← конкретные значения
  icon?: string;
}

export async function getPublicPromptsServer(
  page: number = 1,
  sort: string = 'newest',
  search: string = '',
  tagName: string = '',
  categoryName: string = '',
  lang: string = 'ru'
): Promise<{ prompts: Prompt[]; total: number; pages: number }> {
  let url = `${API_URL}/api/prompts?page=${page}&per_page=12&sort=${sort}&search=${encodeURIComponent(search)}&lang=${lang}`;
  
  if (tagName) {
    url += `&tag=${encodeURIComponent(tagName)}`;
  }
  if (categoryName) {
    url += `&category=${encodeURIComponent(categoryName)}`;
  }
  
  const response = await fetch(url, {
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch prompts');
  }
  
  return response.json();
}

export async function getCategoriesServer(lang: string = 'ru'): Promise<Tag[]> {
  const response = await fetch(`${API_URL}/api/categories?lang=${lang}`, {
    cache: 'no-store',
  });
  
  if (!response.ok) {
    return [];
  }
  
  const data = await response.json();
  // Убедимся, что type = 'category'
  return (data.categories || []).map((cat: any) => ({ ...cat, type: 'category' as const }));
}

export async function getAllTagsServer(lang: string = 'ru'): Promise<Tag[]> {
  const response = await fetch(`${API_URL}/api/tags?type=ai_model&lang=${lang}`, {
    cache: 'no-store',
  });
  
  if (!response.ok) {
    return [];
  }
  
  const data = await response.json();
  // Убедимся, что type = 'ai_model'
  return (data.tags || []).map((tag: any) => ({ ...tag, type: 'ai_model' as const }));
}
