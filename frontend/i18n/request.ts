// frontend/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';

export const locales = ['ru', 'en'];
export const defaultLocale = 'ru';

export default getRequestConfig(async ({ requestLocale }) => {
  // Получаем локаль из URL
  let locale = await requestLocale;
  
  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }
  
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});