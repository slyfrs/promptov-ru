// frontend/app/sitemap.ts
import { MetadataRoute } from 'next'
import { getAllTagsServer, getCategoriesServer } from '@/lib/api-server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://promptov.ru'
  
  // Статические страницы
  const staticPages = [
    { url: `${baseUrl}/ru`, lastModified: new Date() },
    { url: `${baseUrl}/en`, lastModified: new Date() },
    { url: `${baseUrl}/ru/leaderboard`, lastModified: new Date() },
    { url: `${baseUrl}/en/leaderboard`, lastModified: new Date() },
    { url: `${baseUrl}/ru/about`, lastModified: new Date() },
    { url: `${baseUrl}/en/about`, lastModified: new Date() },
  ]
  
  // Динамические страницы (промпты) — можно добавить позже
  // const prompts = await getPromptsForSitemap()
  // const promptPages = prompts.map(prompt => ({ ... }))
  
  return staticPages
}