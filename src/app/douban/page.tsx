'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DoubanItem, DoubanResult } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import DoubanFilters from '@/components/DoubanFilters';
import DoubanTagSystem from '@/components/DoubanTagSystem';
import PageLayout from '@/components/PageLayout';
import TagManager from '@/components/TagManager';
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
  const [movieTags, setMovieTags] = useState(['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '治愈']);
  const [tvTags, setTvTags] = useState(['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片']);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const type = searchParams.get('type');
  const tag = searchParams.get('tag');

  // 生成骨架屏数据
  const skeletonData = Array.from({ length: 25 }, (_, index) => index);

  // 加載用戶標籤
  useEffect(() => {
    const loadUserTags = () => {
      try {
        const savedMovieTags = localStorage.getItem('userMovieTags');
        const savedTvTags = localStorage.getItem('userTvTags');
        
        if (savedMovieTags) {
          setMovieTags(JSON.parse(savedMovieTags));
        }
        
        if (savedTvTags) {
          setTvTags(JSON.parse(savedTvTags));
        }
      } catch (e) {
        console.error('加載標籤失敗：', e);
      }
    };

    loadUserTags();
  }, []);

  // 處理標籤變更
  const handleTagsChange = (newTags: string[]) => {
    if (type === 'movie') {
      setMovieTags(newTags);
      localStorage.setItem('userMovieTags', JSON.stringify(newTags));
    } else {
      setTvTags(newTags);
      localStorage.setItem('userTvTags', JSON.stringify(newTags));
    }
  };

  // 處理標籤切換
  const handleTagChange = (newTag: string) => {
    // 更新 URL 參數
    const params = new URLSearchParams(searchParams);
    params.set('tag', newTag);
    window.history.pushState({}, '', `${window.location.pathname}?${params}`);
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

    return params.toString();
  }, [type, tag, filters]);

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

    const typeText = type === 'movie' ? '电影' : '电视剧';
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

        {/* 標籤系統 - 使用與首頁相同的標籤管理 */}
        {type && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setTagManagerOpen(true)}
                className="py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 bg-gray-800 text-gray-300 hover:bg-pink-700 hover:text-white border border-gray-600 hover:border-white flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                管理标签
              </button>

              {/* 顯示當前標籤列表 */}
              {(type === 'movie' ? movieTags : tvTags).map(tagItem => (
                <button
                  key={tagItem}
                  onClick={() => handleTagChange(tagItem)}
                  className={`py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ${
                    tag === tagItem
                      ? 'bg-pink-600 text-white shadow-md border-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-pink-700 hover:text-white border-gray-600 hover:border-white'
                  }`}
                >
                  {tagItem}
                </button>
              ))}
            </div>
          </div>
        )}

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

        {/* TagManager 組件 */}
        <TagManager
          isOpen={isTagManagerOpen}
          onClose={() => setTagManagerOpen(false)}
          tags={type === 'movie' ? movieTags : tvTags}
          onTagsChange={handleTagsChange}
          defaultTags={type === 'movie' ? ['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '治愈'] : ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片']}
          mediaType={type as 'movie' | 'tv'}
          currentTag={tag || '热门'}
          onTagChange={handleTagChange}
        />
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
