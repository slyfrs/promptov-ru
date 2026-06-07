// frontend/app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://promptov.ru'
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/settings', '/favorites', '/create-prompt', '/edit-prompt'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}