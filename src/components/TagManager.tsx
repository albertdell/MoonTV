'use client';

import React, { useState } from 'react';

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tags: string[];
  onTagsChange: (newTags: string[]) => void;
  defaultTags: string[];
  mediaType: 'movie' | 'tv';
  currentTag: string;
  onTagChange: (tag: string) => void;
}

const TagManager: React.FC<TagManagerProps> = ({ 
  isOpen, 
  onClose, 
  tags, 
  onTagsChange, 
  defaultTags, 
  mediaType,
  currentTag,
  onTagChange
}) => {
  const [newTag, setNewTag] = useState('');

  if (!isOpen) return null;

  // 添加標籤 - 完全照抄 LibreTV 的邏輯
  const addTag = (tag: string) => {
    // 安全處理標籤名，防止XSS
    const safeTag = tag
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .trim();

    if (!safeTag) {
      alert('標籤名稱不能為空');
      return;
    }

    // 檢查是否已存在（忽略大小寫）
    const exists = tags.some(
      existingTag => existingTag.toLowerCase() === safeTag.toLowerCase()
    );

    if (exists) {
      alert('標籤已存在');
      return;
    }

    // 添加到標籤數組
    const newTags = [...tags, safeTag];
    onTagsChange(newTags);
    
    // 保存到本地存儲
    try {
      const storageKey = mediaType === 'movie' ? 'userMovieTags' : 'userTvTags';
      localStorage.setItem(storageKey, JSON.stringify(newTags));
    } catch (e) {
      // console.error('保存標籤失敗：', e);
    }

    setNewTag('');
  };

  // 刪除標籤 - 完全照抄 LibreTV 的邏輯
  const deleteTag = (tagToDelete: string) => {
    // 熱門標籤不能刪除
    if (tagToDelete === '热门') {
      alert('熱門標籤不能刪除');
      return;
    }

    const newTags = tags.filter(tag => tag !== tagToDelete);
    onTagsChange(newTags);

    // 保存到本地存儲
    try {
      const storageKey = mediaType === 'movie' ? 'userMovieTags' : 'userTvTags';
      localStorage.setItem(storageKey, JSON.stringify(newTags));
    } catch (e) {
      // console.error('保存標籤失敗：', e);
    }

    // 如果刪除的是當前選中的標籤，切換到熱門
    if (tagToDelete === currentTag) {
      onTagChange('热门');
    }
  };

  // 重置為默認標籤 - 完全照抄 LibreTV 的邏輯
  const resetTagsToDefault = () => {
    const newTags = [...defaultTags];
    onTagsChange(newTags);

    // 保存到本地存儲
    try {
      const storageKey = mediaType === 'movie' ? 'userMovieTags' : 'userTvTags';
      localStorage.setItem(storageKey, JSON.stringify(newTags));
    } catch (e) {
      // console.error('保存標籤失敗：', e);
    }

    // 如果當前標籤不在默認標籤中，切換到熱門
    if (!newTags.includes(currentTag)) {
      onTagChange('热门');
    }

    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim()) {
      addTag(newTag.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40" onClick={onClose}>
      <div className="bg-[#191919] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl"
        >
          &times;
        </button>
        
        <h3 className="text-xl font-bold text-white mb-4">
          标签管理 ({mediaType === 'movie' ? '电影' : '电视剧'})
        </h3>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-medium text-gray-300">标签列表</h4>
            <button 
              onClick={resetTagsToDefault}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              恢复默认标签
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {tags.length ? (
              tags.map(tag => {
                const canDelete = tag !== '热门';
                return (
                  <div 
                    key={tag} 
                    className="bg-[#1a1a1a] text-gray-300 py-1.5 px-3 rounded text-sm font-medium flex justify-between items-center group"
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
                无标签，请添加或恢复默认
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-lg font-medium text-gray-300 mb-3">添加新标签</h4>
          <form onSubmit={handleSubmit} className="flex items-center">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="输入标签名称..."
              className="flex-1 bg-[#222] text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-pink-500"
            />
            <button 
              type="submit" 
              className="ml-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded"
            >
              添加
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            提示：标签名称不能为空，不能重复，不能包含特殊字符
          </p>
        </div>
      </div>
    </div>
  );
};

export default TagManager;
