// frontend/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

// Создаём middleware для next-intl
const intlMiddleware = createMiddleware({
  locales: ['ru', 'en'],
  defaultLocale: 'ru',
  localePrefix: 'always',
  localeDetection: true,
});

// Список публичных роутов (без учёта локали)
const PUBLIC_ROUTES = [
  '/',           // главная
  '/login',
  '/register',
  '/prompts',
  '/leaderboard',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/about',
];

// Проверка, является ли путь публичным
function isPublicRoute(pathname: string): boolean {
  // Убираем локаль из пути (первый сегмент)
  const segments = pathname.split('/');
  // Если путь состоит только из локали (например /ru или /en) - это главная
  if (segments.length === 2 && (segments[1] === 'ru' || segments[1] === 'en')) {
    return true; // главная страница
  }
  
  // Убираем локаль для остальных путей
  const withoutLocale = segments.length > 2 ? '/' + segments.slice(2).join('/') : pathname;
  
  // Проверяем точное совпадение или начало пути
  return PUBLIC_ROUTES.some(route => {
    if (route === '/') return withoutLocale === '/' || withoutLocale === '';
    if (withoutLocale === route) return true;
    // Для промптов: /prompt/123 начинается с /prompt/
    if (route === '/prompts' && withoutLocale.startsWith('/prompt/')) return true;
    return false;
  });
}

// Кастомная логика (авторизация, админка)
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Сначала получаем ответ от next-intl (он добавляет локаль)
  const response = intlMiddleware(request);
  
  // Получаем локаль из URL
  const locale = pathname.split('/')[1] || 'ru';
  
  // Проверяем, публичный ли роут
  const publicRoute = isPublicRoute(pathname);
  
  // Админские роуты
  const isAdminRoute = pathname.includes('/admin');
  
  // Получаем токен из cookies
  const token = request.cookies.get('access_token_cookie')?.value;
  
  // Если нет токена и роут не публичный - редирект на логин
  if (!token && !publicRoute) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // Если есть токен и роут login/register - редирект в дашборд
  if (token && (pathname.includes('/login') || pathname.includes('/register'))) {
    const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
    return NextResponse.redirect(dashboardUrl);
  }
  
  // Для админских роутов - проверяем роль пользователя через API
  if (isAdminRoute && token) {
    try {
      const apiResponse = await fetch('http://backend:5000/api/auth/me', {
        headers: {
          Cookie: `access_token_cookie=${token}`,
        },
      });
      
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        if (data.user?.role !== 'admin' && data.user?.role !== 'moderator') {
          const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
          return NextResponse.redirect(dashboardUrl);
        }
      } else {
        const loginUrl = new URL(`/${locale}/login`, request.url);
        return NextResponse.redirect(loginUrl);
      }
    } catch (error) {
      console.error('Middleware error:', error);
      const loginUrl = new URL(`/${locale}/login`, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Возвращаем ответ от next-intl
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
