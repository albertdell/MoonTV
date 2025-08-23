'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface DoubanTagSystemProps {
  type: 'movie' | 'tv';
  specificCategory?: string; // 新增：指定特定分類
}

// 默認標籤定義 - 參考LibreTV的實現
const getDefaultTags = (type: 'movie' | 'tv', category?: string) => {
  if (type === 'movie') {
    if (category === 'top250') {
      return ['全部', '经典', '剧情', '喜剧', '动作', '爱情', '科幻', '悬疑', '恐怖', '动画'];
    }
    // 電影的默認標籤
    return ['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '治愈'];
  } else {
    // 電視劇根據不同分類使用不同標籤
    switch (category) {
      case '综艺':
        return ['热门', '脱口秀', '真人秀', '音乐', '舞蹈', '喜剧', '访谈', '游戏', '美食', '旅行', '时尚', '体育'];
      case '美剧':
        return ['热门', '剧情', '喜剧', '犯罪', '科幻', '奇幻', '惊悚', '动作', '爱情', '家庭', '医务', '律政'];
      case '韩剧':
        return ['热门', '爱情', '剧情', '喜剧', '悬疑', '古装', '现代', '家庭', '职场', '校园', '医务', '法律'];
      case '日剧':
        return ['热门', '剧情', '爱情', '喜剧', '悬疑', '推理', '职场', '校园', '家庭', '医务', '料理', '时代'];
      case '日本动画':
      case '日漫':
        return ['热门', '冒险', '动作', '喜剧', '剧情', '奇幻', '科幻', '恋爱', '校园', '运动', '音乐', '治愈'];
      case '英剧':
        return ['热门', '剧情', '喜剧', '犯罪', '历史', '科幻', '奇幻', '悬疑', '家庭', '传记'];
      case '国产剧':
        return ['热门', '古装', '现代', '都市', '农村', '军旅', '谍战', '家庭', '青春', '职场'];
      case '港剧':
        return ['热门', '警匪', '商战', '家庭', '武侠', '时装', '古装', '喜剧', '悬疑'];
      case '纪录片':
        return ['热门', '自然', '历史', '科学', '社会', '人物', '旅行', '美食', '艺术', '军事'];
      default:
        // 電視劇的默認標籤
        return ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片'];
    }
  }
};

// 從本地存儲加載用戶標籤
const loadUserTags = (type: 'movie' | 'tv', category?: string): string[] => {
  try {
    const storageKey = `moonTV_douban_tags_${category || type}`;
    const savedTags = localStorage.getItem(storageKey);
    
    if (savedTags) {
      return JSON.parse(savedTags);
    } else {
      // 如果沒有保存的標籤，使用默認標籤
      return getDefaultTags(type, category);
    }
  } catch (e) {
    console.error('加載用戶標籤失敗:', e);
    return getDefaultTags(type, category);
  }
};

// 保存用戶標籤到本地存儲
const saveUserTags = (tags: string[], type: 'movie' | 'tv', category?: string) => {
  try {
    const storageKey = `moonTV_douban_tags_${category || type}`;
    localStorage.setItem(storageKey, JSON.stringify(tags));
  } catch (e) {
    console.error('保存用戶標籤失敗:', e);
  }
};

const DoubanTagSystem: React.FC<DoubanTagSystemProps> = ({ type, specificCategory }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTag = searchParams.get('tag') || '热门';
  
  const [tags, setTags] = useState<string[]>([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  

  // 獲取當前分類的唯一標識符 - 使用 useCallback 避免依賴警告
  const getCategoryKeyCallback = useCallback(() => {
    if (specificCategory) {
      return specificCategory; // 日漫、美劇、日劇等
    }
    
    // 如果沒有 specificCategory，但是電視劇，使用當前標籤作為分類標識
    if (type === 'tv') {
      const currentTag = searchParams.get('tag') || '热门';
      return currentTag; // 使用當前標籤作為分類標識
    }
    
    return type; // movie
  }, [specificCategory, type, searchParams]);

  // 獨立分類標籤系統 - 每個分類完全獨立
  useEffect(() => {
    // 使用新的標籤加載函數
    if (typeof window !== 'undefined') {
      const userTags = loadUserTags(type, specificCategory);
      setTags(userTags);
    } else {
      const defaultTags = getDefaultTags(type, specificCategory);
      setTags(defaultTags);
    }
  }, [type, specificCategory]);

  // 獨立分類標籤保存系統
  const saveTags = (newTags: string[]) => {
    try {
      saveUserTags(newTags, type, specificCategory);
      setTags(newTags);
    } catch (error) {
      console.error('保存標籤失敗:', error);
    }
  };

  // 重置到默認標籤
  const resetToDefaultTags = () => {
    const defaultTags = getDefaultTags(type, specificCategory);
    saveTags(defaultTags);
  };

  // 處理標籤點擊 - 使用豆瓣分類功能（原始功能）
  const handleTagClick = (tag: string) => {
    if (tag !== currentTag) {
      // 使用豆瓣分類 API - 恢復原始的分類功能
      const params = new URLSearchParams(searchParams);
      params.set('tag', tag);
      
      // 保持在豆瓣頁面，只更新標籤參數
      const newUrl = `/douban?${params.toString()}`;
      router.push(newUrl);
    }
  };

  // 添加標籤 - 恢復原本的標籤功能
  const addTag = (tag: string) => {
    // 安全處理標籤名，防止XSS
    const safeTag = tag
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .trim();

    if (!safeTag) return;

    // 檢查是否已存在（忽略大小寫）
    const exists = tags.some(
      existingTag => existingTag.toLowerCase() === safeTag.toLowerCase()
    );

    if (exists) {
      alert('標籤已存在');
      return;
    }

    // 添加到標籤數組並保存
    const newTags = [...tags, safeTag];
    saveTags(newTags);
    setNewTag('');
  };

  // 刪除標籤 - 完全按照 LibreTV 的邏輯
  const deleteTag = (tagToDelete: string) => {
    if (tagToDelete === '热门') {
      alert('熱門標籤不能刪除');
      return;
    }

    const newTags = tags.filter(tag => tag !== tagToDelete);
    saveTags(newTags);

    // 如果刪除的是當前選中的標籤，切換到熱門
    if (tagToDelete === currentTag) {
      handleTagClick('热门');
    }
  };

  // 重置為默認標籤 - 完全按照 LibreTV 的邏輯
  const resetTagsToDefault = () => {
    const defaultTags = getDefaultTags(type, specificCategory);
    saveTags(defaultTags);
    setShowManageModal(false);
    
    // 如果當前標籤不在默認標籤中，切換到熱門
    if (!defaultTags.includes(currentTag)) {
      handleTagClick('热门');
    }
  };

  return (
    <div className="mb-6">
      {/* 豆瓣標籤標題 */}
      <h3 className="text-lg font-semibold text-gray-200 mb-3">豆瓣標籤 (分類功能)</h3>
      {/* 標籤容器 - 完全按照 LibreTV 的樣式 */}
      <div className="flex flex-wrap gap-2">
        {/* 管理標籤按鈕 */}
        <button
          onClick={() => setShowManageModal(true)}
          className="py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 bg-gray-800 text-gray-300 hover:bg-pink-700 hover:text-white border border-gray-600 hover:border-white flex items-center"
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          管理豆瓣標籤
        </button>

        {/* 標籤列表 - 完全按照 LibreTV 的渲染邏輯 */}
        {tags.map((tag) => (
          <button
            key={`${getCategoryKeyCallback()}-${tag}`}
            onClick={() => handleTagClick(tag)}
            className={`py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ${
              tag === currentTag
                ? 'bg-pink-600 text-white shadow-md border-white'
                : 'bg-gray-800 text-gray-300 hover:bg-pink-700 hover:text-white border-gray-600 hover:border-white'
            }`}
            title={`豆瓣分類: ${getCategoryKeyCallback()} | 標籤: ${tag}`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 標籤管理模態框 - 完全按照 LibreTV 的設計 */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowManageModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>

            <h3 className="text-xl font-bold text-white mb-4">
              豆瓣標籤管理 - {specificCategory || (type === 'movie' ? '電影' : '電視劇')}
            </h3>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-300">豆瓣標籤列表</h4>
                <button
                  onClick={resetTagsToDefault}
                  className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  恢復默認標籤
                </button>
              </div>

              {/* 標籤網格 - 完全按照 LibreTV 的佈局 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {tags.length ? (
                  tags.map((tag) => {
                    const canDelete = tag !== '热门';
                    return (
                      <div
                        key={tag}
                        className="bg-gray-800 text-gray-300 py-1.5 px-3 rounded text-sm font-medium flex justify-between items-center group"
                      >
                        <span>{tag}</span>
                        {canDelete ? (
                          <button
                            onClick={() => deleteTag(tag)}
                            className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        ) : (
                          <span className="text-gray-500 text-xs italic opacity-0 group-hover:opacity-100">
                            必需
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-4 text-gray-500">
                    無標籤，請添加或恢復默認
                  </div>
                )}
              </div>
            </div>

            {/* 添加新標籤 */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-lg font-medium text-gray-300 mb-3">添加新豆瓣標籤</h4>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTag(newTag);
                }}
                className="flex items-center mb-4"
              >
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="輸入豆瓣分類名稱（如：恐怖）..."
                  className="flex-1 bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-pink-500"
                />
                <button
                  type="submit"
                  className="ml-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded"
                >
                  添加
                </button>
              </form>
              
              {/* 重置按鈕 */}
              <div className="border-t border-gray-700 pt-4">
                <button
                  onClick={resetToDefaultTags}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded mb-2"
                >
                  重置為默認標籤
                </button>
                <p className="text-xs text-gray-500">
                  提示：點擊標籤將顯示該豆瓣分類的影片。重置將恢復到系統默認標籤。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoubanTagSystem;