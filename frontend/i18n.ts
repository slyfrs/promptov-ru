// frontend/i18n.ts
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['ru', 'en'];
export const defaultLocale = 'ru';

export default getRequestConfig(async ({ locale }) => {
  // Убеждаемся, что locale определена
  const activeLocale = locale || defaultLocale;
  
  // Проверяем, поддерживается ли локаль
  if (!locales.includes(activeLocale as any)) notFound();
  
  // Загружаем сообщения для локали
  const messages = (await import(`./messages/${activeLocale}.json`)).default;
  
  // Возвращаем объект с locale и messages
  return {
    locale: activeLocale,
    messages,
  };
});