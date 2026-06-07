'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { checkAuth, User } from '@/lib/auth';
import { getMyProfile, updateMyProfile } from '@/lib/api';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { useToast } from '@/components/Toast';

interface PrivacySettings {
  bio: boolean;
  birth_date: boolean;
  city: boolean;
  telegram: boolean;
  github: boolean;
  website: boolean;
}

interface ProfileFormData {
  bio: string;
  birth_date: string;
  city: string;
  telegram: string;
  github: string;
  website: string;
  privacy_settings: PrivacySettings;
}

// Валидация URL
const isValidUrl = (url: string): boolean => {
  if (!url) return true;
  const pattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  return pattern.test(url);
};

// Валидация Telegram username
const isValidTelegram = (username: string): boolean => {
  if (!username) return true;
  const pattern = /^[a-zA-Z0-9_]{5,32}$/;
  return pattern.test(username);
};

// Валидация даты рождения (не может быть в будущем)
const isValidBirthDate = (dateStr: string): boolean => {
  if (!dateStr) return true;
  const date = new Date(dateStr);
  const today = new Date();
  return date <= today;
};

// Валидация города (только буквы, дефис, пробел)
const isValidCity = (city: string): boolean => {
  if (!city) return true;
  const pattern = /^[a-zA-Zа-яА-ЯёЁ\s\-\.]+$/;
  return pattern.test(city);
};

export default function SettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const {showToast, ToastComponent } = useToast();
  const [formData, setFormData] = useState<ProfileFormData>({
    bio: '',
    birth_date: '',
    city: '',
    telegram: '',
    github: '',
    website: '',
    privacy_settings: {
      bio: true,
      birth_date: false,
      city: true,
      telegram: true,
      github: true,
      website: true
    }
  });

  useEffect(() => {
    const loadUser = async () => {
      const userData = await checkAuth();
      if (!userData) {
        router.push('/login');
        return;
      }
      setUser(userData);
      
      try {
        const profile = await getMyProfile();
        setFormData({
          bio: profile.bio || '',
          birth_date: profile.birth_date || '',
          city: profile.city || '',
          telegram: profile.telegram || '',
          github: profile.github || '',
          website: profile.website || '',
          privacy_settings: profile.privacy_settings || {
            bio: true,
            birth_date: false,
            city: true,
            telegram: true,
            github: true,
            website: true
          }
        });
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
      }
      
      setLoading(false);
    };
    loadUser();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePrivacyChange = (field: keyof PrivacySettings) => {
    setFormData({
      ...formData,
      privacy_settings: {
        ...formData.privacy_settings,
        [field]: !formData.privacy_settings[field]
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Валидация: проверяем город
    if (formData.city && !isValidCity(formData.city)) {
      setErrorMessage(t('settings.city_invalid'));
      setSaving(false);
      return;
    }

    // Валидация: проверяем длину города
    if (formData.city && formData.city.length > 100) {
      setErrorMessage(t('settings.city_too_long'));
      setSaving(false);
      return;
    }

    // Валидация: проверяем URL
    if (formData.website && !isValidUrl(formData.website)) {
      setErrorMessage(t('settings.url_invalid'));
      setSaving(false);
      return;
    }

    // Валидация: проверяем Telegram username
    if (formData.telegram && !isValidTelegram(formData.telegram)) {
      setErrorMessage(t('settings.telegram_invalid'));
      setSaving(false);
      return;
    }

    // Валидация: проверяем дату рождения (не в будущем)
    if (formData.birth_date && !isValidBirthDate(formData.birth_date)) {
      setErrorMessage(t('settings.birth_date_future'));
      setSaving(false);
      return;
    }

    // Валидация: GitHub username (опционально)
    if (formData.github && !/^[a-zA-Z0-9-]{1,39}$/.test(formData.github)) {
      setErrorMessage(t('settings.github_invalid'));
      setSaving(false);
      return;
    }

    try {
      await updateMyProfile(formData);
      setSuccessMessage(t('settings.success'));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || t('settings.error_general'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="text-center py-12">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
          <button
            onClick={() => router.push(`/profile/${user?.id}`)}
            className="text-gray-600 hover:underline text-sm"
          >
            👁️ {t('settings.view_profile')}
          </button>
        </div>
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {successMessage}
          </div>
        )}
        
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {errorMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* О себе */}
          <div className="bg-[#f5f5f7] rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.bio_label')}
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
                  placeholder={t('settings.bio_placeholder')}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {formData.bio.length}/500 {t('settings.characters')}
                </p>
              </div>
              <div className="ml-4">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={formData.privacy_settings.bio}
                    onChange={() => handlePrivacyChange('bio')}
                    className="w-4 h-4 border-color: #d1d5db  !important"
                  />
                  {t('settings.public')}
                </label>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Дата рождения */}
            <div className="bg-[#f5f5f7] rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.birth_date_label')}
                  </label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="ml-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.privacy_settings.birth_date}
                      onChange={() => handlePrivacyChange('birth_date')}
                      className="w-4 h-4"
                    />
                    {t('settings.public')}
                  </label>
                </div>
              </div>
            </div>
            
            {/* Город */}
            <div className="bg-[#f5f5f7] rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.city_label')}
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    maxLength={100}
                    className="w-full px-3 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
                    placeholder={t('settings.city_placeholder')}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {formData.city.length}/100 {t('settings.characters')}. {t('settings.city_hint')}
                  </p>
                </div>
                <div className="ml-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.privacy_settings.city}
                      onChange={() => handlePrivacyChange('city')}
                      className="w-4 h-4"
                    />
                    {t('settings.public')}
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Социальные сети */}
          <div className="bg-[#f5f5f7] rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">{t('settings.social_title')}</h2>
            <div className="space-y-4">
              {/* Telegram */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.telegram_label')}
                  </label>
                  <input
                    type="text"
                    name="telegram"
                    value={formData.telegram}
                    onChange={handleChange}
                    maxLength={32}
                    className="w-full px-3 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
                    placeholder={t('settings.telegram_placeholder')}
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('settings.telegram_hint')}</p>
                </div>
                <div className="ml-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.privacy_settings.telegram}
                      onChange={() => handlePrivacyChange('telegram')}
                      className="w-4 h-4"
                    />
                    {t('settings.public')}
                  </label>
                </div>
              </div>
              
              {/* GitHub */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.github_label')}
                  </label>
                  <input
                    type="text"
                    name="github"
                    value={formData.github}
                    onChange={handleChange}
                    maxLength={39}
                    className="w-full px-3 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
                    placeholder={t('settings.github_placeholder')}
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('settings.github_hint')}</p>
                </div>
                <div className="ml-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.privacy_settings.github}
                      onChange={() => handlePrivacyChange('github')}
                      className="w-4 h-4"
                    />
                    {t('settings.public')}
                  </label>
                </div>
              </div>
              
              {/* Сайт */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('settings.website_label')}
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border-none rounded-xl focus:ring-0 focus:outline-none focus:border-gray-400"
                    placeholder={t('settings.website_placeholder')}
                  />
                  <p className="text-xs text-gray-400 mt-1">{t('settings.website_hint')}</p>
                </div>
                <div className="ml-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.privacy_settings.website}
                      onChange={() => handlePrivacyChange('website')}
                      className="w-4 h-4"
                    />
                    {t('settings.public')}
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Безопасность */}
          <div className="bg-[#f5f5f7] rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">{t('settings.security_title')}</h2>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              🔐 {t('settings.change_password_button')}
            </button>
            
            {!user?.email_confirmed && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700 mb-2">
                  ⚠️ {t('settings.email_not_confirmed_warning')}
                </p>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/auth/resend-verification', {
                      method: 'POST',
                      credentials: 'include',
                    });
                    const data = await res.json();
                    showToast(data.message || data.error, res.ok ? 'success' : 'error');
                  }}
                  className="text-sm text-gray-600 hover:underline"
                >
                  {t('settings.resend_email_button')}
                </button>
              </div>
            )}
          </div>
          
          {/* Кнопка сохранения */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
            >
              {saving ? t('settings.saving_button') : t('settings.save_button')}
            </button>
          </div>
        </form>
      </div>
      
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => {
          setSuccessMessage(t('settings.password_changed'));
          setTimeout(() => setSuccessMessage(''), 3000);
        }}
      />
    </div>
  );
}