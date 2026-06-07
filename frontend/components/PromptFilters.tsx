'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Tag } from '@/lib/api';
import IconDisplay from './IconDisplay';

interface FilterOption {
  value: string;
  label: string;
}

interface PromptFiltersProps {
  showSearch?: boolean;
  showCategories?: boolean;
  showNeuralNetworks?: boolean;
  showSort?: boolean;
  showStatus?: boolean;
  categories?: Tag[];
  neuralTags?: Tag[];
  
  search: string;
  setSearch: (value: string) => void;
  
  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number | null) => void;
  
  selectedNeural: string;
  setSelectedNeural: (value: string) => void;
  
  sort: string;
  setSort: (value: string) => void;
  
  selectedStatus?: string;
  setSelectedStatus?: (value: string) => void;
  
  sortOptions?: FilterOption[];
  onFilterChange?: () => void;
  showReset?: boolean;
}

export default function PromptFilters({
  showSearch = true,
  showCategories = true,
  showNeuralNetworks = true,
  showSort = true,
  showStatus = false,
  categories = [],
  neuralTags = [],
  search,
  setSearch,
  selectedCategoryId,
  setSelectedCategoryId,
  selectedNeural,
  setSelectedNeural,
  sort,
  setSort,
  selectedStatus = 'all',
  setSelectedStatus,
  sortOptions = [],
  onFilterChange,
  showReset = true,
}: PromptFiltersProps) {
  const t = useTranslations('filters');
  const locale = useLocale();
  
  // Дефолтные опции сортировки с переводами
  const defaultSortOptions: FilterOption[] = [
    { value: 'newest', label: `📅 ${t('newest')}` },
    { value: 'oldest', label: `📅 ${t('oldest')}` },
    { value: 'popular', label: `🔥 ${t('popular')}` },
  ];
  
  const statusOptions: FilterOption[] = [
    { value: 'all', label: t('status.all') },
    { value: 'published', label: `✅ ${t('status.published')}` },
    { value: 'pending', label: `⏳ ${t('status.pending')}` },
    { value: 'private', label: `📝 ${t('status.private')}` },
    { value: 'rejected', label: `❌ ${t('status.rejected')}` },
  ];
  
  const finalSortOptions = sortOptions.length > 0 ? sortOptions : defaultSortOptions;
  
  const handleFilterChange = () => {
    onFilterChange?.();
  };

  const handleCategoryClick = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    handleFilterChange();
  };

  const handleNeuralClick = (neuralName: string) => {
    setSelectedNeural(neuralName);
    handleFilterChange();
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    handleFilterChange();
  };

  const handleStatusChange = (value: string) => {
    if (setSelectedStatus) {
      setSelectedStatus(value);
      handleFilterChange();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange();
  };

  const handleReset = () => {
    setSearch('');
    setSelectedCategoryId(null);
    setSelectedNeural('');
    setSort('newest');
    if (setSelectedStatus) setSelectedStatus('all');
    handleFilterChange();
  };

  const hasActiveFilters = search || selectedCategoryId !== null || selectedNeural || sort !== 'newest' || (selectedStatus && selectedStatus !== 'all');

  const getCategoryName = (cat: Tag): string => {
    return locale === 'en' ? (cat.name_en || cat.name) : (cat.name_ru || cat.name);
  };

  const getNeuralName = (tag: Tag): string => {
    return locale === 'en' ? (tag.name_en || tag.name) : (tag.name_ru || tag.name);
  };

  return (
    <div className="space-y-6">
      {/* Поиск */}
      {showSearch && (
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full px-4 py-3 pr-12 bg-[#f5f5f7] border-none rounded-xl focus:ring-2 focus:ring-gray-400 focus:bg-white transition-colors text-gray-800 placeholder-gray-400"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            🔍
          </button>
        </form>
      )}

      {/* Статус (для кабинета) */}
      {showStatus && setSelectedStatus && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t('status_title')}</h3>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedStatus === option.value
                    ? 'bg-gray-700 text-white shadow-md'
                    : 'bg-[#f5f5f7] text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Категории */}
      {showCategories && categories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t('categories')}</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryClick(null)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategoryId === null
                  ? 'bg-gray-700 text-white shadow-md'
                  : 'bg-[#f5f5f7] text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('all')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`px-3 py-1 rounded-full text-sm transition-colors inline-flex items-center gap-1 ${
                  selectedCategoryId === cat.id
                    ? 'bg-gray-700 text-white shadow-md'
                    : 'bg-[#f5f5f7] text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.icon ? (
                  <IconDisplay name={cat.icon} size={14} />
                ) : (
                  <span>📂</span>
                )}
                <span>{getCategoryName(cat)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Нейросети */}
      {showNeuralNetworks && neuralTags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t('neural_networks')}</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleNeuralClick('')}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedNeural === ''
                  ? 'bg-gray-700 text-white shadow-md'
                  : 'bg-[#f5f5f7] text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('all')}
            </button>
            {neuralTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleNeuralClick(getNeuralName(tag))}
                className={`px-3 py-1 rounded-full text-sm transition-colors inline-flex items-center gap-1 ${
                  selectedNeural === getNeuralName(tag)
                    ? 'bg-gray-700 text-white shadow-md'
                    : 'bg-[#f5f5f7] text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag.icon ? (
                  <IconDisplay name={tag.icon} size={14} />
                ) : (
                  <span>🧠</span>
                )}
                <span>{getNeuralName(tag)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Сортировка и сброс */}
      <div className="flex justify-between items-center flex-wrap gap-3 pt-2 border-t border-gray-100">
        {showSort && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('sort_by')}:</span>
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-1 bg-[#f5f5f7] border-none rounded-xl focus:ring-2 focus:ring-gray-400 text-sm text-gray-700 cursor-pointer"
            >
              {finalSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {showReset && hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            🗑️ {t('reset')}
          </button>
        )}
      </div>
    </div>
  );
}