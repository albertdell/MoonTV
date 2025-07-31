'use client';

import React, { useState, useEffect } from 'react';

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tags: string[];
  onTagsChange: (newTags: string[]) => void;
  defaultTags: string[];
  mediaType: 'movie' | 'tv';
}

const TagManager: React.FC<TagManagerProps> = ({ isOpen, onClose, tags, onTagsChange, defaultTags, mediaType }) => {
  const [internalTags, setInternalTags] = useState(tags);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    setInternalTags(tags);
  }, [tags]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (newTag && !internalTags.includes(newTag)) {
      const updatedTags = [...internalTags, newTag];
      setInternalTags(updatedTags);
      onTagsChange(updatedTags);
      setNewTag('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    if (tagToDelete === '热门') return; // "热门" is a required tag
    const updatedTags = internalTags.filter(tag => tag !== tagToDelete);
    setInternalTags(updatedTags);
    onTagsChange(updatedTags);
  };

  const handleResetTags = () => {
    setInternalTags(defaultTags);
    onTagsChange(defaultTags);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">管理{mediaType === 'movie' ? '电影' : '电视剧'}标签</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">&times;</button>
        </div>

        <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">当前标签</h3>
                <button onClick={handleResetTags} className="text-sm text-blue-500 hover:underline">恢复默认</button>
            </div>
            <div className="flex flex-wrap gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-md min-h-[4rem]">
            {internalTags.map(tag => (
              <div key={tag} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full flex items-center gap-2">
                <span>{tag}</span>
                {tag !== '热门' && (
                  <button onClick={() => handleDeleteTag(tag)} className="text-red-500 hover:text-red-700">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="添加新标签"
            className="flex-grow px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleAddTag} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">添加</button>
        </div>
      </div>
    </div>
  );
};

export default TagManager;
