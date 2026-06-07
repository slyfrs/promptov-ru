'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { checkAuth } from '@/lib/auth';
import { likePrompt } from '@/lib/api';
import { useToast } from './Toast';

interface LikeButtonProps {
  promptId: number;
  initialLiked?: boolean;
  initialLikesCount?: number;
  onLikeChange?: (liked: boolean, likesCount: number) => void;
}

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

export default function LikeButton({ 
  promptId, 
  initialLiked = false, 
  initialLikesCount = 0,
  onLikeChange 
}: LikeButtonProps) {
  const t = useTranslations();
  const { showToast, ToastComponent } = useToast();
  const [liked, setLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    checkAuth().then(user => setIsLoggedIn(!!user));
  }, []);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      showToast(t('like_button.login_to_like'), 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await likePrompt(promptId);
      setLiked(data.liked);
      setLikesCount(data.likes_count);
      onLikeChange?.(data.liked, data.likes_count);
      
      // Анимация при лайке
      if (data.liked) {
        setAnimate(true);
        setTimeout(() => setAnimate(false), 300);
      }
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleLike}
        disabled={loading}
        className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors hover:bg-black/5 disabled:opacity-50"
      >
        <span className="text-sm font-medium text-gray-500">
          {formatNumber(likesCount)}
        </span>
        <span 
          className={`text-2xl transition-all duration-200 ${
            liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
          } ${animate ? 'scale-125' : 'scale-100'}`}
          style={{ display: 'inline-block' }}
        >
          {liked ? '❤️' : '🤍'}
        </span>
      </button>
      {ToastComponent}
    </>
  );
}