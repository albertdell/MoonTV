'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface CustomTagSystemProps {
  type: 'movie' | 'tv';
  specificCategory?: string; // 新增：指定特定分類
}

// 自訂標籤系統 - 只保留「热门」作為預設標籤
const getCategoryTags = (type: 'movie' | 'tv', category?: string) => {
  // 所有分類都只返回「热门」作為預設標籤
  return ['热门'];
};

const CustomTagSystem: React.FC<CustomTagSystemProps> = ({ type, specificCategory }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTag = searchParams.get('tag') || '热门';
  
  const [tags, setTags] = useState<string[]>([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newTag, setNewTag] = useState('');

  // 生成分類鍵值 - 每個分類完全獨立
  const getCategoryKeyCallback = useCallback(() => {
    // 如果有 specificCategory，直接使用
    if (specificCategory) {
      return `${type}_${specificCategory}`;
    }
    
    // 如果沒有 specificCategory，但是電視劇，使用當前標籤作為分類標識
    if (type === 'tv') {
      const currentTag = searchParams.get('tag') || '热门';
      return currentTag; // 使用當前標籤作為分類標識
    }
    
    return type; // 電影直接使用 type
  }, [type, specificCategory, searchParams]);

  // 獨立分類標籤系統 - 每個分類完全獨立
  useEffect(() => {
    const categoryKey = getCategoryKeyCallback();
    const categoryTags = getCategoryTags(type, specificCategory);
    
    try {
      const storageKey = `moonTV_custom_tags_${categoryKey}`;
      
      const savedTags = localStorage.getItem(storageKey);
      if (savedTags) {
        const parsedTags = JSON.parse(savedTags);
        if (Array.isArray(parsedTags) && parsedTags.length > 0) {
          setTags(parsedTags);
        } else {
          setTags(categoryTags);
        }
      } else {
        setTags(categoryTags);
      }
    } catch (error) {
      setTags(categoryTags);
    }
  }, [type, specificCategory, getCategoryKeyCallback]);

  // 獨立分類標籤保存系統
  const saveTags = (newTags: string[]) => {
    const categoryKey = getCategoryKeyCallback();
    const storageKey = `moonTV_custom_tags_${categoryKey}`;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(newTags));
      setTags(newTags);
    } catch (error) {
      console.error('保存標籤失敗:', error);
    }
  };

  // 處理標籤點擊 - 統一使用搜尋功能（自訂標籤的核心功能）
  const handleTagClick = (tag: string) => {
    if (tag !== currentTag) {
      // 直接使用標籤名稱作為搜尋關鍵字，不加分類前綴
      // 因為第三方搜尋API用純關鍵字搜尋效果更好
      const searchQuery = tag;
      
      // 跳轉到搜尋頁面
      router.push(`/search?query=${encodeURIComponent(searchQuery)}`);
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
    const defaultTags = getCategoryTags(type, specificCategory);
    saveTags(defaultTags);

    // 如果當前標籤不在默認標籤中，切換到熱門
    if (!defaultTags.includes(currentTag)) {
      handleTagClick('热门');
    }
  };

  return (
    <div className="mb-6">
      {/* 自訂標籤標題 */}
      <h3 className="text-lg font-semibold text-gray-200 mb-3">自訂標籤 (搜尋功能)</h3>
      
      {/* 標籤容器 - 完全按照 LibreTV 的樣式 */}
      <div className="flex flex-wrap gap-2">
        {/* 管理標籤按鈕 */}
        <button
          onClick={() => setShowManageModal(true)}
          className="py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
        >
          管理自訂標籤
        </button>

        {/* 標籤列表 - 完全按照 LibreTV 的渲染邏輯 */}
        {tags.map((tag) => (
          <button
            key={`${getCategoryKeyCallback()}-${tag}`}
            onClick={() => handleTagClick(tag)}
            className={`py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ${
              tag === currentTag
                ? 'bg-pink-600 border-pink-600 text-white'
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={`搜尋關鍵字: ${tag}`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* 標籤管理模態框 - 完全按照 LibreTV 的設計 */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                自訂標籤管理 - {specificCategory || (type === 'movie' ? '電影' : '電視劇')}
              </h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-medium text-gray-300">自訂標籤列表</h4>
                <button
                  onClick={resetTagsToDefault}
                  className="text-sm bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded"
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
                        className="flex items-center justify-between bg-gray-700 rounded px-3 py-2 group"
                      >
                        <span>{tag}</span>
                        {canDelete ? (
                          <button
                            onClick={() => deleteTag(tag)}
                            className="delete-tag-btn text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
              <h4 className="text-lg font-medium text-gray-300 mb-3">添加新自訂標籤</h4>
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
                  placeholder="輸入搜尋關鍵字（如：柯南）..."
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
                提示：點擊標籤將搜尋包含該關鍵字的影片標題
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTagSystem;