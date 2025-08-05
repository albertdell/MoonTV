'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DoubanItem, DoubanResult } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import DoubanFilters from '@/components/DoubanFilters';
import DoubanTagSystem from '@/components/DoubanTagSystem';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

interface FilterOptions {
  sort: string;
}

function DoubanPageClient() {
  const searchParams = useSearchParams();
  const [doubanData, setDoubanData] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    sort: 'recommend',
  });
  const [isTagManagerOpen, setTagManagerOpen] = useState(false);
  // 移除舊的標籤狀態 - 現在由 DoubanTagSystem 獨立管理
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const type = searchParams.get('type');
  const tag = searchParams.get('tag');
  const title = searchParams.get('title'); // 獲取分類標題

  // 生成骨架屏数据
  const skeletonData = Array.from({ length: 25 }, (_, index) => index);

  // 移除舊的標籤管理邏輯 - 現在由 DoubanTagSystem 獨立處理

  // 移除舊的標籤變更處理 - 現在由 DoubanTagSystem 獨立處理

  // 處理標籤切換
  const handleTagChange = (newTag: string) => {
    // 更新 URL 參數，保持當前的分類上下文
    const params = new URLSearchParams(searchParams);
    params.set('tag', newTag);
    
    // 確保保持正確的 type 參數
    if (type) {
      params.set('type', type);
    }
    
    // 如果是特定分類（如日漫、美劇等），保持 title 參數
    const currentTitle = searchParams.get('title');
    if (currentTitle) {
      params.set('title', currentTitle);
    }
    
    const newUrl = `${window.location.pathname}?${params}`;
    window.history.pushState({}, '', newUrl);
    
    // 強制重新加載頁面以確保數據更新
    window.location.reload();
  };

  // 處理篩選器變更
  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  // 構建查詢參數
  const buildQueryParams = useCallback((pageStart = 0) => {
    const params = new URLSearchParams({
      type: type || '',
      tag: tag || '',
      pageSize: '25',
      pageStart: pageStart.toString(),
      sort: filters.sort,
    });

    // 如果有分類標題，添加到查詢參數
    if (title) {
      params.set('title', title);
    }

    return params.toString();
  }, [type, tag, title, filters]);

  useEffect(() => {
    if (!type || !tag) {
      setError('缺少必要参数: type 或 tag');
      setLoading(false);
      return;
    }

    // 重置页面状态
    setDoubanData([]);
    setCurrentPage(0);
    setHasMore(true);
    setError(null);
    setIsLoadingMore(false);

    // 立即加载第一页数据
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const queryString = buildQueryParams(0);
        console.log('發送請求到:', `/api/douban?${queryString}`);
        const response = await fetch(`/api/douban?${queryString}`);

        if (!response.ok) {
          console.error('API 響應錯誤:', response.status, response.statusText);
          throw new Error('获取豆瓣数据失败');
        }

        const data: DoubanResult = await response.json();
        console.log('收到數據:', data);

        if (data.code === 200) {
          setDoubanData(data.list);
          setHasMore(data.list.length === 25);
        } else {
          throw new Error(data.message || '获取数据失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取豆瓣数据失败');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [type, tag, filters, buildQueryParams]);

  // 单独处理 currentPage 变化（加载更多）
  useEffect(() => {
    if (currentPage > 0 && type && tag) {
      const fetchMoreData = async () => {
        try {
          setIsLoadingMore(true);
          const queryString = buildQueryParams(currentPage * 25);
          const response = await fetch(`/api/douban?${queryString}`);

          if (!response.ok) {
            throw new Error('获取豆瓣数据失败');
          }

          const data: DoubanResult = await response.json();

          if (data.code === 200) {
            setDoubanData((prev) => [...prev, ...data.list]);
            setHasMore(data.list.length === 25);
          } else {
            throw new Error(data.message || '获取数据失败');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : '获取豆瓣数据失败');
        } finally {
          setIsLoadingMore(false);
        }
      };

      fetchMoreData();
    }
  }, [currentPage, type, tag, buildQueryParams]);

  // 设置滚动监听
  useEffect(() => {
    // 如果没有更多数据或正在加载，则不设置监听
    if (!hasMore || isLoadingMore || loading) {
      return;
    }

    // 确保 loadingRef 存在
    if (!loadingRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loading]);

  const getPageTitle = () => {
    // 优先使用 URL 中的 title 参数
    const titleParam = searchParams.get('title');
    if (titleParam) {
      return titleParam;
    }

    // 如果 title 参数不存在，根据 type 和 tag 拼接
    if (!type || !tag) return '豆瓣内容';

    // 分類顯示名稱映射
    const getTypeText = (type: string) => {
      switch (type) {
        case 'movie': return '电影';
        case 'tv': return '电视剧';
        case 'us_drama': return '美剧';
        case 'kr_drama': return '韩剧';
        case 'jp_drama': return '日剧';
        case 'jp_anime': return '日漫';
        case 'variety': return '综艺';
        default: return '未知分类';
      }
    };
    
    const typeText = getTypeText(type);
    const tagText = tag === 'top250' ? 'Top250' : tag;

    return `${typeText} - ${tagText}`;
  };

  const getActivePath = () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (tag) params.set('tag', tag);
    const titleParam = searchParams.get('title');
    if (titleParam) params.set('title', titleParam);

    const queryString = params.toString();
    const activePath = `/douban${queryString ? `?${queryString}` : ''}`;
    return activePath;
  };

  return (
    <PageLayout activePath={getActivePath()}>
      <div className='px-4 sm:px-10 py-4 sm:py-8 overflow-visible'>
        {/* 页面标题 */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-800 mb-2 dark:text-gray-200'>
            {getPageTitle()}
          </h1>
          <p className='text-gray-600 dark:text-gray-400'>来自豆瓣的精选内容</p>
        </div>

        {/* 標籤系統 - 根據分類使用不同的標籤管理 */}
        {type && <DoubanTagSystem type={type as 'movie' | 'tv' | 'us_drama' | 'kr_drama' | 'jp_drama' | 'jp_anime' | 'variety'} specificCategory={title || undefined} />}
        
        {/* 調試信息 */}
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <p className="text-sm">調試信息: type={type}, tag={tag}, title={title}</p>
          <p className="text-sm">當前分類: {title || getTypeText(type)}</p>
        </div>

        {/* 排序器 */}
        {type && tag && (
          <DoubanFilters
            type={type}
            onFiltersChange={handleFiltersChange}
          />
        )}

        {/* 内容展示区域 */}
        <div className='max-w-[95%] mx-auto mt-8 overflow-visible'>
          {error ? (
            <div className='flex justify-center items-center h-40'>
              <div className='text-red-500 text-center'>
                <div className='text-lg font-semibold mb-2'>加载失败</div>
                <div className='text-sm'>{error}</div>
              </div>
            </div>
          ) : (
            <>
              {/* 内容网格 */}
              <div className='grid grid-cols-3 gap-x-2 gap-y-12 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] sm:gap-x-8 sm:gap-y-20'>
                {loading
                  ? // 显示骨架屏
                    skeletonData.map((index) => (
                      <DoubanCardSkeleton key={index} />
                    ))
                  : // 显示实际数据
                    doubanData.map((item, index) => (
                      <div key={`${item.title}-${index}`} className='w-full'>
                        <VideoCard
                          from='douban'
                          title={item.title}
                          poster={item.poster}
                          douban_id={item.id}
                          rate={item.rate}
                        />
                      </div>
                    ))}
              </div>

              {/* 加载更多指示器 */}
              {hasMore && !loading && (
                <div
                  ref={(el) => {
                    if (el && el.offsetParent !== null) {
                      (
                        loadingRef as React.MutableRefObject<HTMLDivElement | null>
                      ).current = el;
                    }
                  }}
                  className='flex justify-center mt-12 py-8'
                >
                  {isLoadingMore && (
                    <div className='flex items-center gap-2'>
                      <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-green-500'></div>
                      <span className='text-gray-600'>加载中...</span>
                    </div>
                  )}
                </div>
              )}

              {/* 没有更多数据提示 */}
              {!hasMore && doubanData.length > 0 && (
                <div className='text-center text-gray-500 py-8'>
                  已加载全部内容
                </div>
              )}

              {/* 空状态 */}
              {!loading && doubanData.length === 0 && !error && (
                <div className='text-center text-gray-500 py-8'>
                  暂无相关内容
                </div>
              )}
            </>
          )}
        </div>

        {/* 移除舊的 TagManager - 現在由 DoubanTagSystem 獨立處理 */}
      </div>
    </PageLayout>
  );
}

export default function DoubanPage() {
  return (
    <Suspense>
      <DoubanPageClient />
    </Suspense>
  );
}
