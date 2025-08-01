'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

// 客户端收藏 API
import {
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
} from '@/lib/db.client';
import { DoubanItem, DoubanResult } from '@/lib/types';

import CapsuleSwitch from '@/components/CapsuleSwitch';
import ContinueWatching from '@/components/ContinueWatching';
import PageLayout from '@/components/PageLayout';
import ScrollableRow from '@/components/ScrollableRow';
import { useSite } from '@/components/SiteProvider';
import TagManager from '@/components/TagManager';
import VideoCard from '@/components/VideoCard';

function HomeClient() {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [currentTag, setCurrentTag] = useState('热门');
  const [displayedContent, setDisplayedContent] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('recommend');
  const { announcement } = useSite();
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [isTagManagerOpen, setTagManagerOpen] = useState(false);

  // Default tags
  const defaultMovieTags = ['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '治愈'];
  const defaultTvTags = ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片'];

  const [movieTags, setMovieTags] = useState(defaultMovieTags);
  const [tvTags, setTvTags] = useState(defaultTvTags);


  // Load tags from localStorage on mount - 完全照抄 LibreTV 的 loadUserTags 邏輯
  useEffect(() => {
    const loadUserTags = () => {
      try {
        // 嘗試從本地存儲加載用戶保存的標籤
        const savedMovieTags = localStorage.getItem('userMovieTags');
        const savedTvTags = localStorage.getItem('userTvTags');
        
        // 如果本地存儲中有標籤數據，則使用它
        if (savedMovieTags) {
          setMovieTags(JSON.parse(savedMovieTags));
        } else {
          // 否則使用默認標籤
          setMovieTags([...defaultMovieTags]);
        }
        
        if (savedTvTags) {
          setTvTags(JSON.parse(savedTvTags));
        } else {
          // 否則使用默認標籤
          setTvTags([...defaultTvTags]);
        }
      } catch (e) {
        console.error('加載標籤失敗：', e);
        // 初始化為默認值，防止錯誤
        setMovieTags([...defaultMovieTags]);
        setTvTags([...defaultTvTags]);
      }
    };

    loadUserTags();
  }, []);

  // 收藏夹数据
  type FavoriteItem = {
    id: string;
    source: string;
    title: string;
    poster: string;
    episodes: number;
    source_name: string;
    currentEpisode?: number;
    search_title?: string;
  };

  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  // 检查公告弹窗状态
  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeenAnnouncement !== announcement) {
        setShowAnnouncement(true);
      } else {
        setShowAnnouncement(Boolean(!hasSeenAnnouncement && announcement));
      }
    }
  }, [announcement]);

  // 获取豆瓣数据
  useEffect(() => {
    if (activeTab === 'favorites') return;

    const fetchDoubanData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/douban?type=${mediaType}&tag=${currentTag}&sort=${sortOrder}`);
        if (response.ok) {
          const data: DoubanResult = await response.json();
          setDisplayedContent(data.list || []);
        } else {
          console.error('Failed to fetch Douban data:', response.status);
          setDisplayedContent([]);
        }
      } catch (error) {
        console.error('Error fetching Douban data:', error);
        setDisplayedContent([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDoubanData();
  }, [mediaType, currentTag, sortOrder, activeTab]);

  // 当切换到收藏夹时加载收藏数据
  useEffect(() => {
    if (activeTab !== 'favorites') return;

    (async () => {
      const [allFavorites, allPlayRecords] = await Promise.all([
        getAllFavorites(),
        getAllPlayRecords(),
      ]);

      // 根据保存时间排序（从近到远）
      const sorted = Object.entries(allFavorites)
        .sort(([, a], [, b]) => b.save_time - a.save_time)
        .map(([key, fav]) => {
          const plusIndex = key.indexOf('+');
          const source = key.slice(0, plusIndex);
          const id = key.slice(plusIndex + 1);

          // 查找对应的播放记录，获取当前集数
          const playRecord = allPlayRecords[key];
          const currentEpisode = playRecord?.index;

          return {
            id,
            source,
            title: fav.title,
            year: fav.year,
            poster: fav.cover,
            episodes: fav.total_episodes,
            source_name: fav.source_name,
            currentEpisode,
            search_title: fav?.search_title,
          } as FavoriteItem;
        });
      setFavoriteItems(sorted);
    })();
  }, [activeTab]);

  const handleCloseAnnouncement = (announcement: string) => {
    setShowAnnouncement(false);
    localStorage.setItem('hasSeenAnnouncement', announcement); // 记录已查看弹窗
  };

  const handleTagsChange = (newTags: string[]) => {
    if (mediaType === 'movie') {
      setMovieTags(newTags);
      localStorage.setItem('userMovieTags', JSON.stringify(newTags));
    } else {
      setTvTags(newTags);
      localStorage.setItem('userTvTags', JSON.stringify(newTags));
    }
  };

  // 處理標籤切換 - 完全照抄 LibreTV 的邏輯
  const handleTagChange = (tag: string) => {
    if (currentTag !== tag) {
      setCurrentTag(tag);
      // 重新加載內容
      setLoading(true);
    }
  };

  return (
    <PageLayout>
      <div className='px-2 sm:px-10 py-4 sm:py-8 overflow-visible'>
        {/* 顶部 Tab 切换 */}
        <div className='mb-8 flex justify-center'>
          <CapsuleSwitch
            options={[
              { label: '首页', value: 'home' },
              { label: '收藏夹', value: 'favorites' },
            ]}
            active={activeTab}
            onChange={(value) => setActiveTab(value as 'home' | 'favorites')}
          />
        </div>

        <div className='max-w-[95%] mx-auto'>
          {activeTab === 'favorites' ? (
            // 收藏夹视图
            <section className='mb-8'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-xl font-bold text-gray-800 dark:text-gray-200'>
                  我的收藏
                </h2>
                {favoriteItems.length > 0 && (
                  <button
                    className='text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    onClick={async () => {
                      await clearAllFavorites();
                      setFavoriteItems([]);
                    }}
                  >
                    清空
                  </button>
                )}
              </div>
              <div className='justify-start grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8 sm:px-4'>
                {favoriteItems.map((item) => (
                  <div key={item.id + item.source} className='w-full'>
                    <VideoCard
                      query={item.search_title}
                      {...item}
                      from='favorite'
                    />
                  </div>
                ))}
                {favoriteItems.length === 0 && (
                  <div className='col-span-full text-center text-gray-500 py-8 dark:text-gray-400'>
                    暂无收藏内容
                  </div>
                )}
              </div>
            </section>
          ) : (
            // 首页视图
            <>
              <ContinueWatching />
              <div className='mb-8 flex justify-center'>
                <CapsuleSwitch
                  options={[
                    { label: '电影', value: 'movie' },
                    { label: '电视剧', value: 'tv' },
                  ]}
                  active={mediaType}
                  onChange={(value) => {
                    setMediaType(value as 'movie' | 'tv');
                    setCurrentTag('热门'); // Reset tag on media type change
                  }}
                />
              </div>
              {/* 標籤容器 - 完全照抄 LibreTV 的 renderDoubanTags 邏輯 */}
              <div className="flex flex-wrap gap-2 mb-4 justify-center">
                {/* 管理標籤按鈕 - 完全照抄 LibreTV 的設計 */}
                <button
                  onClick={() => setTagManagerOpen(true)}
                  className="py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 bg-gray-800 text-gray-300 hover:bg-pink-700 hover:text-white border border-gray-600 hover:border-white flex items-center"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  管理标签
                </button>

                {/* 標籤列表 - 完全照抄 LibreTV 的渲染邏輯 */}
                {(mediaType === 'movie' ? movieTags : tvTags).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setCurrentTag(tag)}
                    className={`py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ${
                      currentTag === tag
                        ? 'bg-pink-600 text-white shadow-md border-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-pink-700 hover:text-white border-gray-600 hover:border-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* 添加排序功能到首頁 */}
              <div className="flex justify-center mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">排序:</h3>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="recommend">推薦排序</option>
                      <option value="time">時間排序</option>
                      <option value="rank">評分排序</option>
                    </select>
                  </div>
                </div>
              </div>
              <section className='mb-8'>
                <div className='justify-start grid grid-cols-3 gap-x-2 gap-y-14 sm:gap-y-20 px-2 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8 sm:px-4'>
                  {loading
                    ? Array.from({ length: 16 }).map((_, index) => (
                        <div
                          key={index}
                          className='w-full'
                        >
                          <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 animate-pulse dark:bg-gray-800'>
                            <div className='absolute inset-0 bg-gray-300 dark:bg-gray-700'></div>
                          </div>
                          <div className='mt-2 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-800'></div>
                        </div>
                      ))
                    : displayedContent.map((item, index) => (
                        <div
                          key={index}
                          className='w-full'
                        >
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
              </section>
            </>
          )}
        </div>
      </div>
      {announcement && showAnnouncement && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 p-4 transition-opacity duration-300 ${
            showAnnouncement ? '' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900 transform transition-all duration-300 hover:shadow-2xl'>
            <div className='flex justify-between items-start mb-4'>
              <h3 className='text-2xl font-bold tracking-tight text-gray-800 dark:text-white border-b border-green-500 pb-1'>
                提示
              </h3>
              <button
                onClick={() => handleCloseAnnouncement(announcement)}
                className='text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-white transition-colors'
                aria-label='关闭'
              ></button>
            </div>
            <div className='mb-6'>
              <div className='relative overflow-hidden rounded-lg mb-4 bg-green-50 dark:bg-green-900/20'>
                <div className='absolute inset-y-0 left-0 w-1.5 bg-green-500 dark:bg-green-400'></div>
                <p className='ml-4 text-gray-600 dark:text-gray-300 leading-relaxed'>
                  {announcement}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCloseAnnouncement(announcement)}
              className='w-full rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 text-white font-medium shadow-md hover:shadow-lg hover:from-green-700 hover:to-green-800 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 transition-all duration-300 transform hover:-translate-y-0.5'
            >
              我知道了
            </button>
          </div>
        </div>
      )}
      <TagManager
        isOpen={isTagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
        tags={mediaType === 'movie' ? movieTags : tvTags}
        onTagsChange={handleTagsChange}
        defaultTags={mediaType === 'movie' ? defaultMovieTags : defaultTvTags}
        mediaType={mediaType}
        currentTag={currentTag}
        onTagChange={handleTagChange}
      />
    </PageLayout>
  );
}


export default function Home() {
  return (
    <Suspense>
      <HomeClient />
    </Suspense>
  );
}
