'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { getAllTags, getCategories, Tag } from '@/lib/api';
import IconDisplay from '@/components/IconDisplay';
import { useToast } from '@/components/Toast';

export default function CreatePromptPage() {
  const t = useTranslations();
  const locale = useLocale(); // получаем текущий язык
  const router = useRouter();
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [neuralTags, setNeuralTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Tag[]>([]);
  const [resultImage, setResultImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    theme: '',      // сохраняем name_ru или name_en? лучше id категории
    themeId: null as number | null,
    tags: [] as string[],
  });

  const sanitizeTitle = (title: string): string => {
    let cleaned = title
      .replace(/[\\]/g, '')
      .replace(/[\"]/g, '"')
      .replace(/[\n\r]/g, ' ')
      .trim();
    
    if (cleaned.length > 255) {
      cleaned = cleaned.slice(0, 252) + '...';
    }
    
    return cleaned;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [neural, cats] = await Promise.all([
          getAllTags(locale),
          getCategories(locale),
        ]);
        setNeuralTags(neural);
        setCategories(cats);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      }
    };
    loadData();
  }, [locale]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let value = e.target.value;
    const name = e.target.name;
    
    if (name === 'title') {
      value = sanitizeTitle(value);
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = parseInt(e.target.value);
    const selectedCategory = categories.find(c => c.id === selectedId);
    setFormData({
      ...formData,
      themeId: selectedId,
      theme: selectedCategory?.name || '',
    });
  };

  const handleTagToggle = (tagName: string, tagId: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName]
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast(t('create_prompt.image_invalid_type'), 'error');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast(t('create_prompt.image_too_large'), 'error');
        return;
      }
      setResultImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setResultImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.tags.length === 0) {
      setError(t('create_prompt.error_no_neural'));
      setLoading(false);
      return;
    }

    if (!formData.themeId) {
      setError(t('create_prompt.error_no_category'));
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('theme_id', formData.themeId.toString());  // отправляем id категории
      formDataToSend.append('tags', JSON.stringify(formData.tags));
      if (resultImage) {
        formDataToSend.append('result_image', resultImage);
      }
      
      const response = await fetch('/api/prompts', {
        method: 'POST',
        credentials: 'include',
        body: formDataToSend,
      });
      const data = await response.json();
      
      if (response.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || t('create_prompt.error_general'));
      }
    } catch (err: any) {
      setError(err.message || t('create_prompt.error_general'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-[#f5f5f7] rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('create_prompt.title')}</h1>
          <p className="text-gray-600 mb-6">{t('create_prompt.subtitle')}</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Название */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('create_prompt.title_label')} *
              </label>
              <input
                type="text"
                name="title"
                required
                maxLength={255}
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
                placeholder={t('create_prompt.title_placeholder')}
              />
              <p className="text-xs text-gray-400 mt-1">
                {formData.title.length}/255 {t('create_prompt.characters')}
              </p>
            </div>

            {/* Текст промпта */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('create_prompt.content_label')} *
              </label>
              <textarea
                name="content"
                required
                rows={8}
                value={formData.content}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400 font-mono"
                placeholder={t('create_prompt.content_placeholder')}
              />
            </div>

            {/* Результат (текстовое описание) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('create_prompt.description_label')}
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
                placeholder={t('create_prompt.description_placeholder')}
              />
            </div>

            {/* Пример результата (картинка) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('create_prompt.image_label')}
              </label>
              <p className="text-xs text-gray-500 mb-2">
                {t('create_prompt.image_hint')}
              </p>
              
              {imagePreview ? (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt={t('create_prompt.image_preview_alt')}
                    className="max-w-full max-h-48 rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="result_image"
                  />
                  <label
                    htmlFor="result_image"
                    className="cursor-pointer text-gray-600 hover:text-gray-700"
                  >
                    📷 {t('create_prompt.image_choose')}
                  </label>
                </div>
              )}
            </div>

            {/* Категория */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('create_prompt.category_label')} *
              </label>
              <select
                name="theme"
                required
                value={formData.themeId?.toString() || ''}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
              >
                <option value="">{t('create_prompt.category_placeholder')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Нейросети */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('create_prompt.neural_label')} *
              </label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {neuralTags.length === 0 ? (
                  <p className="text-gray-500 text-sm">{t('create_prompt.neural_loading')}</p>
                ) : (
                  neuralTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.name, tag.id)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors inline-flex items-center gap-1 ${
                        formData.tags.includes(tag.name)
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <IconDisplay name={tag.icon || 'Bot'} size={14} />
                      <span>{tag.name}</span>
                    </button>
                  ))
                )}
              </div>
              {formData.tags.length === 0 && (
                <p className="text-red-500 text-xs mt-1">⚠️ {t('create_prompt.neural_error')}</p>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
              >
                {loading ? t('create_prompt.saving_button') : t('create_prompt.save_button')}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                {t('create_prompt.cancel_button')}
              </button>
            </div>
          </form>
        </div>
      </div>
      {ToastComponent}
    </main>
  );
}