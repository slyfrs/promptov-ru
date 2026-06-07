'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Валидация email
  const isValidEmail = (email: string): boolean => {
    const atIndex = email.indexOf('@');
    if (atIndex === -1) return false;
    
    const domain = email.substring(atIndex + 1);
    const dotIndex = domain.lastIndexOf('.');
    if (dotIndex === -1) return false;
    
    const tld = domain.substring(dotIndex + 1);
    if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!email) {
      setError(t('forgot_password.error_empty_email'));
      setLoading(false);
      return;
    }
    
    if (!isValidEmail(email)) {
      setError(t('forgot_password.error_invalid_email'));
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || t('forgot_password.error_general'));
      }
    } catch (error) {
      setError(t('forgot_password.error_connection'));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16 max-w-md">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-2xl font-bold mb-2">{t('forgot_password.success_title')}</h1>
            <p className="text-gray-600 mb-6">
              {t('forgot_password.success_message', { email })}
            </p>
            <Link href="/login" className="text-blue-600 hover:underline">
              {t('forgot_password.back_to_login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-center mb-6">{t('forgot_password.title')}</h1>
          
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
          
          <p className="text-gray-600 mb-6 text-center">
            {t('forgot_password.instruction')}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('forgot_password.email_label')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={t('forgot_password.email_placeholder')}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('forgot_password.sending_button') : t('forgot_password.submit_button')}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-blue-600 hover:underline">
              ← {t('forgot_password.back_to_login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}