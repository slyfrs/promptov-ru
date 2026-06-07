'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { getPrompt, updatePrompt, getAllTags, Tag, getCategories } from '@/lib/api';
import { checkAuth } from '@/lib/auth';
import IconDisplay from '@/components/IconDisplay';
import { useToast } from '@/components/Toast';

export default function EditPromptPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);
  const { showToast, ToastComponent } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [neuralTags, setNeuralTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Tag[]>([]);
  
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
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
      setLoading(true);
      setError('');
      try {
        const user = await checkAuth();
        if (!user) {
          router.push('/login');
          return;
        }

        const [promptData, neural, cats] = await Promise.all([
          getPrompt(id),
          getAllTags(locale),
          getCategories(locale),
        ]);

        setFormData({
          title: promptData.title,
          content: promptData.content,
          description: promptData.description || '',
          themeId: promptData.theme_id || null,
          tags: promptData.tags?.map(t => t.name) || [],
        });
        setNeuralTags(neural);
        setCategories(cats);
        
        if (promptData.result_image_url) {
          setExistingImageUrl(promptData.result_image_url);
        }
      } catch (err: any) {
        console.error('Ошибка загрузки:', err);
        setError(err.message || t('edit_prompt.load_error'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, router, t, locale]);

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
    setFormData({
      ...formData,
      themeId: selectedId,
    });
  };


  const handleTagToggle = (tagName: string) => {
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
        showToast(t('edit_prompt.image_invalid_type'), 'error');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast(t('edit_prompt.image_too_large'), 'error');
        return;
      }
      setResultImage(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveExistingImage(false);
    }
  };

  const removeExistingImageHandler = () => {
    setRemoveExistingImage(true);
    setExistingImageUrl(null);
  };

  const removeNewImage = () => {
    setResultImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');
    setErrorMessage('');

    if (formData.tags.length === 0) {
      setError(t('edit_prompt.error_no_neural'));
      setSaving(false);
      return;
    }

    if (!formData.themeId) {
      setError(t('edit_prompt.error_no_category'));
      setSaving(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('theme_id', formData.themeId.toString());
      formDataToSend.append('tags', JSON.stringify(formData.tags));
      formDataToSend.append('remove_existing_image', removeExistingImage ? 'true' : 'false');
      
      if (resultImage) {
        formDataToSend.append('result_image', resultImage);
      }
      
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        credentials: 'include',
        body: formDataToSend,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccessMessage(t('edit_prompt.success_message'));
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setErrorMessage(data.error || t('edit_prompt.error_general'));
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('edit_prompt.error_general'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="text-center py-12">{t('common.loading')}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-[#f5f5f7] rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('edit_prompt.title')}</h1>
          <p className="text-gray-600 mb-6">{t('edit_prompt.subtitle')}</p>

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
                <button onClick={() => setSuccessMessage('')} className="text-green-400 hover:text-green-600">
                  ×
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span className="text-red-500">⚠️</span>
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
                <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-600">
                  ×
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <span className="text-red-500">⚠️</span>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
                  ×
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('edit_prompt.title_label')} *
              </label>
              <input
                type="text"
                name="title"
                required
                maxLength={255}
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
                placeholder={t('edit_prompt.title_placeholder')}
              />
              <p className="text-xs text-gray-400 mt-1">
                {formData.title.length}/255 {t('edit_prompt.characters')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('edit_prompt.content_label')} *
              </label>
              <textarea
                name="content"
                required
                rows={8}
                value={formData.content}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400 font-mono"
                placeholder={t('edit_prompt.content_placeholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('edit_prompt.description_label')}
              </label>
              <textarea
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
                placeholder={t('edit_prompt.description_placeholder')}
              />
            </div>

            {/* Картинка */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('edit_prompt.image_label')}
              </label>
              <p className="text-xs text-gray-500 mb-2">
                {t('edit_prompt.image_hint')}
              </p>
              
              {existingImageUrl && !removeExistingImage && !imagePreview && (
                <div className="relative inline-block mb-2">
                  <img 
                    src={existingImageUrl}
                    alt={t('edit_prompt.current_image_alt')}
                    className="max-w-full max-h-48 rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={removeExistingImageHandler}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    title={t('edit_prompt.delete_image_title')}
                  >
                    ×
                  </button>
                </div>
              )}
              
              {imagePreview && (
                <div className="relative inline-block mb-2">
                  <img 
                    src={imagePreview} 
                    alt={t('edit_prompt.preview_alt')}
                    className="max-w-full max-h-48 rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={removeNewImage}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    title={t('edit_prompt.delete_image_title')}
                  >
                    ×
                  </button>
                </div>
              )}
              
              {!imagePreview && (!existingImageUrl || removeExistingImage) && (
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
                    📷 {t('edit_prompt.choose_image')}
                  </label>
                </div>
              )}
              
              {existingImageUrl && !removeExistingImage && !imagePreview && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveExistingImage(true);
                      setExistingImageUrl(null);
                      setTimeout(() => {
                        fileInputRef.current?.click();
                      }, 100);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    📷 {t('edit_prompt.replace_image')}
                  </button>
                </div>
              )}
            </div>

            {/* Категория */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('edit_prompt.category_label')} *
              </label>
              <select
                name="themeId"
                required
                value={formData.themeId?.toString() || ''}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
              >
                <option value="">{t('edit_prompt.category_placeholder')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">{t('edit_prompt.category_loading')}</p>
              )}
            </div>

            {/* Нейросети */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('edit_prompt.neural_label')} *
              </label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {neuralTags.length === 0 ? (
                  <p className="text-gray-500 text-sm">{t('edit_prompt.neural_loading')}</p>
                ) : (
                  neuralTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.name)}
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
                <p className="text-red-500 text-xs mt-1">⚠️ {t('edit_prompt.neural_error')}</p>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
              >
                {saving ? t('edit_prompt.saving_button') : t('edit_prompt.save_button')}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                {t('edit_prompt.cancel_button')}
              </button>
            </div>
          </form>
        </div>
      </div>
      {ToastComponent}
    </main>
  );
}