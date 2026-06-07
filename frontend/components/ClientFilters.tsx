'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import PromptFilters from './PromptFilters';
import type { Tag } from '@/lib/api';  // ← импортируем тип Tag

interface ClientFiltersProps {
  initialCategories: Tag[];  // ← используем тип Tag
  initialNeuralTags: Tag[];  // ← используем тип Tag
  initialSearch: string;
  initialTagName: string;
  initialCategoryName: string;
  initialSort: string;
  locale: string;
}

export default function ClientFilters({
  initialCategories,
  initialNeuralTags,
  initialSearch,
  initialTagName,
  initialCategoryName,
  initialSort,
  locale,
}: ClientFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  
  const [search, setSearch] = useState(initialSearch);
  const [selectedTagName, setSelectedTagName] = useState<string>(initialTagName);
  const [sort, setSort] = useState(initialSort);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(initialCategoryName);
  
  // Находим ID для подсветки в UI (используем name, который уже локализован)
  const selectedCategoryId = initialCategories.find(c => c.name === selectedCategoryName)?.id || null;
  const selectedNeuralId = initialNeuralTags.find(t => t.name === selectedTagName)?.id || null;
  
  // Обновляем URL при изменении фильтров
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedTagName) params.set('tag', selectedTagName);
    if (sort !== 'newest') params.set('sort', sort);
    if (selectedCategoryName) params.set('category', selectedCategoryName);
    
    const queryString = params.toString();
    const newUrl = queryString ? `/${locale}?${queryString}` : `/${locale}`;
    
    router.push(newUrl);
  }, [search, selectedTagName, sort, selectedCategoryName, locale, router]);
  
  // Обработчик выбора категории (по ID, но сохраняем название)
  const handleSetSelectedCategoryId = (categoryId: number | null) => {
    const category = initialCategories.find(c => c.id === categoryId);
    setSelectedCategoryName(category?.name || '');
  };
  
  // Обработчик выбора нейросети
  const handleSetSelectedNeural = (neuralName: string) => {
    setSelectedTagName(neuralName);
  };
  
  return (
    <PromptFilters
      showSearch={true}
      showCategories={true}
      showNeuralNetworks={true}
      showSort={true}
      showStatus={false}
      categories={initialCategories}
      neuralTags={initialNeuralTags}
      search={search}
      setSearch={setSearch}
      selectedCategoryId={selectedCategoryId}
      setSelectedCategoryId={handleSetSelectedCategoryId}
      selectedNeural={selectedTagName}
      setSelectedNeural={handleSetSelectedNeural}
      sort={sort}
      setSort={setSort}
      sortOptions={[
        { value: 'newest', label: `📅 ${t('filters.newest')}` },
        { value: 'oldest', label: `📅 ${t('filters.oldest')}` },
        { value: 'popular', label: `🔥 ${t('filters.popular')}` },
      ]}
      showReset={true}
    />
  );
}