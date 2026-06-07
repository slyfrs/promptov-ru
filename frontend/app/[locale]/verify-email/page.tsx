'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function VerifyEmailPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('verify_email.error_invalid_link'));
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        
        if (response.ok) {
          setStatus('success');
          setMessage(data.message || t('verify_email.success_message'));
        } else {
          setStatus('error');
          setMessage(data.error || t('verify_email.error_general'));
        }
      } catch (error) {
        setStatus('error');
        setMessage(t('verify_email.error_connection'));
      }
    };
    
    verifyEmail();
  }, [token, t]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="text-5xl mb-4">⏳</div>
              <h1 className="text-2xl font-bold mb-2">{t('verify_email.loading_title')}</h1>
              <p className="text-gray-600">{t('verify_email.loading_message')}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">{t('verify_email.success_title')}</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                {t('verify_email.login_button')}
              </Link>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="text-5xl mb-4">❌</div>
              <h1 className="text-2xl font-bold text-red-600 mb-2">{t('verify_email.error_title')}</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link href="/login" className="text-blue-600 hover:underline">
                {t('verify_email.back_to_login')}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}