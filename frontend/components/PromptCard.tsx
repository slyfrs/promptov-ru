'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useRef, useEffect, useState } from 'react';
import LikeButton from './LikeButton';
import IconDisplay from './IconDisplay';

interface PromptCardProps {
  prompt: {
    id: number;
    title: string;
    content: string;
    description: string;
    theme: string;
    theme_name?: string;
    theme_id?: number;
    theme_icon?: string;
    tags: {
      id: number;
      name: string;
      name_ru?: string;
      name_en?: string;
      type: string;
      icon?: string;
    }[];
    likes_count: number;
    comments_count?: number;
    user_liked?: boolean;
    user?: {
      id: number;
      username: string;
      avatar_url?: string;
    };
  };
}

// Цвета для категорий (градиенты для круга)
const getThemeGradient = (theme_id: number): string => {
  const gradients: Record<number, string> = {
    1: 'from-blue-100 to-indigo-200',
    2: 'from-purple-100 to-pink-200',
    3: 'from-pink-100 to-rose-200',
    4: 'from-green-100 to-emerald-200',
    5: 'from-yellow-100 to-amber-200',
    6: 'from-orange-100 to-red-200',
    7: 'from-teal-100 to-cyan-200',
    8: 'from-indigo-100 to-purple-200',
    9: 'from-cyan-100 to-blue-200',
    10: 'from-red-100 to-rose-200',
  };
  return gradients[theme_id] || 'from-gray-100 to-gray-200';
};

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export default function PromptCard({ prompt }: PromptCardProps) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const currentLocale = pathname.split('/')[1] || 'ru';
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const getLocalizedLink = (path: string) => `/${currentLocale}${path}`;

  const displayCategoryName = prompt.theme_name || prompt.theme || t('prompt_card.no_theme');
  const categoryIcon = prompt.theme_icon || 'Tag';
  const themeId = prompt.theme_id || 1;
  const gradientClass = getThemeGradient(themeId);

  // 3D-эффект при движении мыши
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const newRotateY = ((e.clientX - centerX) / (rect.width / 2)) * 3;
      const newRotateX = ((e.clientY - centerY) / (rect.height / 2)) * -3;
      setRotateX(newRotateX);
      setRotateY(newRotateY);
    };

    const handleMouseLeave = () => {
      setRotateX(0);
      setRotateY(0);
      setIsHovered(false);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    card.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
      card.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  const handleCommentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const element = document.getElementById('comments-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Link href={getLocalizedLink(`/prompt/${prompt.id}`)} className="block h-full">
      <div
        ref={cardRef}
        className="card-3d h-full"
        style={{
          transform: isHovered ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)` : 'none',
          transition: 'transform 0.1s ease-out',
        }}
      >
        <div
          className={`
            rounded-2xl p-5 cursor-pointer flex flex-col h-full relative
            transition-all duration-200
            ${isHovered ? 'bg-white shadow-xl' : 'bg-[#f5f5f7] shadow-none'}
          `}
        >
          {/* Хедер с комментариями и лайком */}
          <div className="flex justify-between items-center mb-5 flex-shrink-0">
            {/* Комментарии — слева */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors hover:bg-black/5 cursor-pointer"
              onClick={handleCommentClick}
            >
              <span className="text-xl">💬</span>
              <span className="text-sm font-medium text-gray-500">
                {formatNumber(prompt.comments_count || 0)}
              </span>
            </div>

            {/* Лайк — справа */}
            <LikeButton
              promptId={prompt.id}
              initialLiked={prompt.user_liked}
              initialLikesCount={prompt.likes_count || 0}
            />
          </div>

          {/* Круг с иконкой категории */}
          <div className="flex flex-col items-center mb-5 flex-shrink-0">
            <div
              className={`
                w-16 h-16 rounded-full bg-gradient-to-br ${gradientClass}
                flex items-center justify-center shadow-md
                transition-all duration-200
                ${isHovered ? 'scale-105 shadow-lg' : ''}
              `}
            >
              <IconDisplay name={categoryIcon} size={32} />
            </div>
            <div className="mt-3 px-4 py-1.5 rounded-full bg-black/5 text-sm font-semibold text-gray-800">
              {displayCategoryName}
            </div>
          </div>

          {/* Заголовок */}
          <h3 className="text-xl font-semibold text-center text-gray-900 mb-3 line-clamp-2 flex-shrink-0">
            {truncateText(prompt.title, 40)}
          </h3>

          {/* Описание — растягивается */}
          <p className="text-sm text-gray-500 text-center mb-5 line-clamp-2 flex-grow">
            {truncateText(prompt.description || prompt.content, 90)}
          </p>

          {/* Теги нейросетей */}
          <div className="flex flex-wrap justify-center gap-2 mt-auto pt-4 flex-shrink-0">
            {prompt.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 transition-all duration-200 inline-flex items-center gap-1"
              >
                <IconDisplay name={tag.icon || 'Bot'} size={12} />
                <span>{locale === 'en' ? (tag.name_en || tag.name) : (tag.name_ru || tag.name)}</span>
              </span>
            ))}
            {prompt.tags && prompt.tags.length > 3 && (
              <span className="bg-gray-200 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700">
                +{prompt.tags.length - 3}
              </span>
            )}
          </div>

          {/* Автор */}
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200/50 flex-shrink-0">
            {prompt.user?.avatar_url ? (
              <img
                src={prompt.user.avatar_url}
                alt={prompt.user.username}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                {prompt.user?.username?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-sm font-semibold text-gray-600">
              {prompt.user?.username || t('prompt_card.anonymous')}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}