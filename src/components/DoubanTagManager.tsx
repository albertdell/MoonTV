'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface DoubanTagManagerProps {
  type: 'movie' | 'tv';
  currentTag: string;
  onTagChange: (tag: string) => void;
}

// 參考 LibreTV 的標籤系統
const DEFAULT_MOVIE_TAGS = [
  '热门', '最新', '经典', '豆瓣高分', '冷门佳片', 
  '华语', '欧美', '韩国', '日本', 
  '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '治愈'
];

const DEFAULT_TV_TAGS = [
  '热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', 
  '日本动画', '综艺', '纪录片'
];

const DoubanTagManager: React.FC<DoubanTagManagerProps> = ({ 
  type, 
  currentTag, 
  onTagChange 
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tags, setTags] = useState<string[]>([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newTag, setNewTag] = useState('');

  // 初始化標籤
  useEffect(() => {
    const defaultTags = type === 'movie' ? DEFAULT_MOVIE_TAGS : DEFAULT_TV_TAGS;
    const storageKey = `douban_${type}_tags`;
    const savedTags = localStorage.getItem(storageKey);
    
    if (savedTags) {
      try {
        const parsedTags = JSON.parse(savedTags);
        setTags(Array.isArray(parsedTags) ? parsedTags : defaultTags);
      } catch {
        setTags(defaultTags);
      }
    } else {
      setTags(defaultTags);
    }
  }, [type]);

  // 保存標籤到本地存儲
  const saveTags = (newTags: string[]) => {
    const storageKey = `douban_${type}_tags`;
    localStorage.setItem(storageKey, JSON.stringify(newTags));
    setTags(newTags);
  };

  // 處理標籤點擊
  const handleTagClick = (tag: string) => {
    if (tag !== currentTag) {
      // 更新 URL 參數
      const params = new URLSearchParams(searchParams.toString());
      params.set('tag', tag);
      router.push(`/douban?${params.toString()}`);
      onTagChange(tag);
    }
  };

  // 添加新標籤
  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      saveTags(newTags);
      setNewTag('');
    }
  };

  // 刪除標籤
  const handleDeleteTag = (tagToDelete: string) => {
    if (tagToDelete === '热门') return; // 不能刪除熱門標籤
    
    const newTags = tags.filter(tag => tag !== tagToDelete);
    saveTags(newTags);
    
    // 如果刪除的是當前選中的標籤，切換到熱門
    if (tagToDelete === currentTag) {
      handleTagClick('热门');
    }
  };

  // 重置為默認標籤
  const handleResetTags = () => {
    const defaultTags = type === 'movie' ? DEFAULT_MOVIE_TAGS : DEFAULT_TV_TAGS;
    saveTags(defaultTags);
    setShowManageModal(false);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
          {type === 'movie' ? '電影' : '電視劇'}標籤
        </h3>
        <button
          onClick={() => setShowManageModal(true)}
          className="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
        >
          管理標籤
        </button>
      </div>

      {/* 標籤列表 */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => handleTagClick(tag)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              tag === currentTag
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-500 hover:text-white'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 標籤管理模態框 */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                管理{type === 'movie' ? '電影' : '電視劇'}標籤
              </h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
              >
                ×
              </button>
            </div>

            {/* 當前標籤列表 */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  當前標籤
                </h4>
                <button
                  onClick={handleResetTags}
                  className="text-sm text-blue-500 hover:underline"
                >
                  恢復默認
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-md min-h-[4rem]">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-md flex items-center justify-between group"
                  >
                    <span className="text-sm">{tag}</span>
                    {tag !== '热门' && (
                      <button
                        onClick={() => handleDeleteTag(tag)}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 添加新標籤 */}
            <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
              <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                添加新標籤
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="輸入標籤名稱..."
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim() || tags.includes(newTag.trim())}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                提示：標籤名稱不能為空且不能重複
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoubanTagManager;