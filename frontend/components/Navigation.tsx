'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { checkAuth, logout, User } from '@/lib/auth';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navigation() {
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  const locale = pathname.split('/')[1] || 'ru';

  const loadUser = async () => {
    const userData = await checkAuth();
    setUser(userData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUser();
    
    const handleStorageChange = () => {
      loadUser();
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    loadUser();
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push(`/${locale}/login`);
    router.refresh();
    setMenuOpen(false);
  };

  const getLocalizedLink = (path: string) => `/${locale}${path}`;

  if (isLoading) {
    return (
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/icon-16.svg" alt="Promptov.ru" className="w-8 h-8" />
              <span className="text-xl font-bold text-gray-600">Promptov.ru</span>
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gray-100 shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        {user ? (
          <div className="flex justify-between items-center">
            {/* Логотип - слева */}
            <Link href={getLocalizedLink('/')} className="flex items-center gap-2">
              <img src="/icon-16.svg" alt="Promptov.ru" className="w-8 h-8" />
              <span className="text-xl font-bold text-gray-600 hidden sm:inline">Promptov.ru</span>
            </Link>
            
            {/* Иконки по центру */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-3">
              <Link 
                href={getLocalizedLink('/create-prompt')} 
                className="text-gray-600 hover:text-blue-600 transition-colors p-2"
                title={t('create')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </Link>
              
              <Link 
                href={getLocalizedLink('/favorites')} 
                className="text-gray-600 hover:text-blue-600 transition-colors p-2"
                title={t('favorites')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </Link>
              
              <Link 
                href={getLocalizedLink('/leaderboard')} 
                className="text-gray-600 hover:text-blue-600 transition-colors p-2"
                title={t('leaderboard')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </Link>
              
              <NotificationBell />
              <LanguageSwitcher />
            </div>
            
            {/* Аватар - справа */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex  items-center gap-1 hover:opacity-80 transition-opacity"
              >
                {user.avatar_url ? (
                  <div className="relative">
                    <img 
                      src={user.avatar_url} 
                      alt={user.username} 
                      className="w-9 h-9 rounded-full object-cover border border-gray-200"
                    />
                    {user.email_confirmed ? (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                    ) : (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-white"></span>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-9 h-9 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                    {user.email_confirmed ? (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                    ) : (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-white"></span>
                    )}
                  </div>
                )}
              </button>

              {/* Выпадающее меню */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <p className="font-semibold text-gray-900">{user.username}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  
                  <div className="py-1">
                    <Link href={getLocalizedLink('/create-prompt')} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                      {t('create')}
                    </Link>
                    <Link href={getLocalizedLink('/dashboard')} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                      {t('dashboard')}
                    </Link>
                    <Link href={getLocalizedLink(`/profile/${user.id}`)} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {t('profile')}
                    </Link>
                    <Link href={getLocalizedLink('/favorites')} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      {t('favorites')}
                    </Link>
                    <Link href={getLocalizedLink('/leaderboard')} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>
                      {t('leaderboard')}
                    </Link>
                    <Link href={getLocalizedLink('/settings')} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      {t('settings')}
                    </Link>
                    <Link href={getLocalizedLink('/notifications')} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      {t('notifications')}
                    </Link>
                    {(user.role === 'admin' || user.role === 'moderator') && (
                      <Link href={getLocalizedLink('/admin')} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-purple-600 hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z"/></svg>
                        {user.role === 'admin' ? t('admin') : t('moderation')}
                      </Link>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 border-t mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      {t('logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Неавторизованный пользователь
          <div className="flex justify-between items-center">
            <Link href={getLocalizedLink('/')} className="flex items-center gap-2">
              <img src="/icon-16.svg" alt="Promptov.ru" className="w-8 h-8" />
               <span className="text-xl font-bold text-blue-600 hidden sm:inline">Promptov.ru</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link 
                href={getLocalizedLink('/leaderboard')} 
                className="text-gray-600 hover:text-blue-600 transition-colors p-2"
                title={t('leaderboard')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </Link>
              <LanguageSwitcher />
              <Link href={getLocalizedLink('/login')} className="text-gray-600 hover:text-blue-600 transition-colors">
                {t('login')}
              </Link>
              <Link href={getLocalizedLink('/register')} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                {t('register')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}