'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface UsePromptFiltersProps {
  defaultSort?: string;
  defaultStatus?: string;
  enableUrlSync?: boolean;
  localStorageKey?: string;
}

export function usePromptFilters({ 
  defaultSort = 'newest', 
  defaultStatus = 'all',
  enableUrlSync = true,
  localStorageKey = 'promptov_filters',
}: UsePromptFiltersProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialized = useRef(false);
  
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedNeural, setSelectedNeural] = useState('');
  const [sort, setSort] = useState(defaultSort);
  const [selectedStatus, setSelectedStatus] = useState(defaultStatus);
  const [page, setPage] = useState(1);
  
  // Загрузка из URL или localStorage при монтировании
  useEffect(() => {
    if (isInitialized.current) return;
    
    // Сначала проверяем URL
    const querySearch = searchParams.get('search');
    const queryCategory = searchParams.get('category');
    const queryNeural = searchParams.get('neural');
    const querySort = searchParams.get('sort');
    const queryStatus = searchParams.get('status');
    const queryPage = searchParams.get('page');
    
    if (querySearch || queryCategory || queryNeural || querySort || queryStatus || queryPage) {
      // Есть параметры в URL — используем их
      if (querySearch) setSearch(decodeURIComponent(querySearch));
      if (queryCategory) setSelectedCategoryId(parseInt(queryCategory));
      if (queryNeural) setSelectedNeural(decodeURIComponent(queryNeural));
      if (querySort) setSort(querySort);
      if (queryStatus) setSelectedStatus(queryStatus);
      if (queryPage) setPage(parseInt(queryPage));
    } else {
      // Нет параметров в URL — пробуем загрузить из localStorage
      try {
        const saved = localStorage.getItem(localStorageKey);
        if (saved) {
          const filters = JSON.parse(saved);
          if (filters.search) setSearch(filters.search);
          if (filters.selectedCategoryId) setSelectedCategoryId(filters.selectedCategoryId);
          if (filters.selectedNeural) setSelectedNeural(filters.selectedNeural);
          if (filters.sort) setSort(filters.sort);
          if (filters.selectedStatus) setSelectedStatus(filters.selectedStatus);
          if (filters.page) setPage(filters.page);
        }
      } catch (error) {
        console.error('Ошибка загрузки из localStorage:', error);
      }
    }
    
    isInitialized.current = true;
  }, [searchParams, localStorageKey]);
  
  // Сохранение в localStorage при изменении фильтров
  useEffect(() => {
    if (!isInitialized.current) return;
    
    try {
      const filters = {
        search,
        selectedCategoryId,
        selectedNeural,
        sort,
        selectedStatus,
        page: page > 1 ? page : undefined,
      };
      localStorage.setItem(localStorageKey, JSON.stringify(filters));
    } catch (error) {
      console.error('Ошибка сохранения в localStorage:', error);
    }
  }, [localStorageKey, search, selectedCategoryId, selectedNeural, sort, selectedStatus, page]);
  
  // Обновление URL при изменении фильтров (как было раньше)
  const updateUrl = useCallback(() => {
    if (!enableUrlSync || !isInitialized.current) return;
    
    const params = new URLSearchParams();
    
    if (search) params.set('search', encodeURIComponent(search));
    if (selectedCategoryId) params.set('category', selectedCategoryId.toString());
    if (selectedNeural) params.set('neural', encodeURIComponent(selectedNeural));
    if (sort !== defaultSort) params.set('sort', sort);
    if (selectedStatus !== defaultStatus) params.set('status', selectedStatus);
    if (page > 1) params.set('page', page.toString());
    
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    
    router.replace(newUrl, { scroll: false });
  }, [enableUrlSync, search, selectedCategoryId, selectedNeural, sort, selectedStatus, page, defaultSort, defaultStatus, pathname, router]);
  
  useEffect(() => {
    updateUrl();
  }, [updateUrl, search, selectedCategoryId, selectedNeural, sort, selectedStatus, page]);
  
  const resetFilters = useCallback(() => {
    setSearch('');
    setSelectedCategoryId(null);
    setSelectedNeural('');
    setSort(defaultSort);
    setSelectedStatus(defaultStatus);
    setPage(1);
  }, [defaultSort, defaultStatus]);
  
  const handleFilterChange = useCallback(() => {
    setPage(1);
  }, []);
  
  return {
    search,
    setSearch,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedNeural,
    setSelectedNeural,
    sort,
    setSort,
    selectedStatus,
    setSelectedStatus,
    page,
    setPage,
    resetFilters,
    handleFilterChange,
  };
}