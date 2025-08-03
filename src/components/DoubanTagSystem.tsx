'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';

interface DoubanTagSystemProps {
  type: 'movie' | 'tv';
  specificCategory?: string; // 新增：指定特定分類
}

// 根據不同分類定義不同的標籤系統
const getCategoryTags = (type: 'movie' | 'tv', category?: string) => {
  if (type === 'movie') {
    if (category === 'top250') {
      return ['全部', '经典', '剧情', '喜剧', '动作', '爱情', '科幻', '悬疑', '恐怖', '动画'];
    }
    // 電影的通用標籤（類型標籤）
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
      default:
        // 電視劇的通用標籤
        return ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片'];
    }
  }
};

const DoubanTagSystem: React.FC<DoubanTagSystemProps> = ({ type, specificCategory }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTag = searchParams.get('tag') || '热门';
  
  const [tags, setTags] = useState<string[]>([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newTag, setNewTag] = useState('');

  // 根據類型和分類獲取對應的標籤
  useEffect(() => {
    const categoryTags = getCategoryTags(type, specificCategory);
    
    // 嘗試從localStorage加載用戶自定義標籤
    const storageKey = specificCategory 
      ? `user${type}Tags_${specificCategory}` 
      : `user${type}Tags`;
    
    try {
      const savedTags = localStorage.getItem(storageKey);
      if (savedTags) {
        setTags(JSON.parse(savedTags));
      } else {
        setTags(categoryTags);
      }
    } catch (error) {
      console.error('載入標籤失敗:', error);
      setTags(categoryTags);
    }
  }, [type, specificCategory]);

  // 保存標籤到localStorage
  const saveTags = (newTags: string[]) => {
    const storageKey = specificCategory 
      ? `user${type}Tags_${specificCategory}` 
      : `user${type}Tags`;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(newTags));
      setTags(newTags);
    } catch (error) {
      console.error('保存標籤失敗:', error);
    }
  };

  // 處理標籤點擊 - 完全按照 LibreTV 的邏輯
  const handleTagClick = (tag: string) => {
    if (tag !== currentTag) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tag', tag);
      params.set('type', type);
      router.push(`/douban?${params.toString()}`);
    }
  };

  // 添加標籤 - 完全按照 LibreTV 的邏輯
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

    const newTags = [...tags, safeTag];
    saveUserTags(newTags);
    setNewTag('');
  };

  // 刪除標籤 - 完全按照 LibreTV 的邏輯
  const deleteTag = (tagToDelete: string) => {
    if (tagToDelete === '热门') {
      alert('熱門標籤不能刪除');
      return;
    }

    const newTags = tags.filter(tag => tag !== tagToDelete);
    saveUserTags(newTags);

    // 如果刪除的是當前選中的標籤，切換到熱門
    if (tagToDelete === currentTag) {
      handleTagClick('热门');
    }
  };

  // 重置為默認標籤 - 完全按照 LibreTV 的邏輯
  const resetTagsToDefault = () => {
    const defaultTags = type === 'movie' ? [...DEFAULT_MOVIE_TAGS] : [...DEFAULT_TV_TAGS];
    saveUserTags(defaultTags);
    setShowManageModal(false);
    
    // 如果當前標籤不在默認標籤中，切換到熱門
    if (!defaultTags.includes(currentTag)) {
      handleTagClick('热门');
    }
  };

  return (
    <div className="mb-6">
      {/* 標籤容器 - 完全按照 LibreTV 的樣式 */}
      <div className="flex flex-wrap gap-2">
        {/* 管理標籤按鈕 - 完全按照 LibreTV 的設計 */}
        <button
          onClick={() => setShowManageModal(true)}
          className="py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 bg-gray-800 text-gray-300 hover:bg-pink-700 hover:text-white border border-gray-600 hover:border-white flex items-center"
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          管理標籤
        </button>

        {/* 標籤列表 - 完全按照 LibreTV 的渲染邏輯 */}
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => handleTagClick(tag)}
            className={`py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ${
              tag === currentTag
                ? 'bg-pink-600 text-white shadow-md border-white'
                : 'bg-gray-800 text-gray-300 hover:bg-pink-700 hover:text-white border-gray-600 hover:border-white'
            }`}
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
              標籤管理 ({type === 'movie' ? '電影' : '電視劇'})
            </h3>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-gray-300">標籤列表</h4>
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

            {/* 添加新標籤 - 完全按照 LibreTV 的表單設計 */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-lg font-medium text-gray-300 mb-3">添加新標籤</h4>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTag(newTag);
                }}
                className="flex items-center"
              >
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="輸入標籤名稱..."
                  className="flex-1 bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-pink-500"
                />
                <button
                  type="submit"
                  className="ml-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded"
                >
                  添加
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2">
                提示：標籤名稱不能為空，不能重複，不能包含特殊字符
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoubanTagSystem;