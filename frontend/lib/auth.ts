// frontend/lib/auth.ts

import { User } from '@/types/user';

// export interface User {
//   id: number;
//   email: string;
//   username: string;
//   role: string;
//   trust_score: number;
//   is_blocked: boolean;
//   email_confirmed: boolean;
//   created_at: string;
//   avatar_url?: string;
//   bio?: string;
//   city?: string;
//   telegram?: string;
//   github?: string;
//   website?: string;
// }
export type { User };
// Проверка авторизации
export async function checkAuth(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Выход
export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

// Регистрация
export async function register(email: string, username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, username, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true };
    }
    return { success: false, error: data.error };
  } catch (error) {
    return { success: false, error: 'Ошибка подключения' };
  }
}

// Логин
export async function login(emailOrUsername: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: emailOrUsername, password }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return { success: true };
    }
    return { success: false, error: data.error };
  } catch (error) {
    return { success: false, error: 'Ошибка подключения' };
  }
}