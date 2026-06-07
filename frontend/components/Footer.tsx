// frontend/components/Footer.tsx
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ru';

  // Функция для создания ссылок с учётом локали
  const getLocalizedLink = (path: string) => `/${locale}${path}`;

  return (
    <footer className="bg-gray-100 border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
          {/* Копирайт */}
          <div>
            © {currentYear} promptov.ru — {t('copyright')} • v. 1.0
          </div>
          
          {/* Ссылки */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <a
              href="https://t.me/promptov_blog"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              aria-label="Telegram"
            >
              <img src="/telegram.svg" alt="Telegram" className="w-5 h-5" />
              <span>Telegram</span>
            </a>
            
            <Link
              href={getLocalizedLink('/about')}
              className="flex items-center gap-1 hover:text-blue-500 transition-colors"
            >
              <img src="/icon-16.svg" alt="Promptov" className="w-4 h-4" />
              <span>{t('about')}</span>
            </Link>
          </div>
          
          {/* Сделано с любовью */}
          <div className="flex items-center gap-1">
            {t('made_with')} <span className="text-red-500">❤️</span> {t('for_ai_enthusiasts')}
          </div>
        </div>
      </div>
    </footer>
  );
}