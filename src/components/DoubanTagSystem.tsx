'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface DoubanTagSystemProps {
  type: 'movie' | 'tv';
}

const DoubanTagSystem: React.FC<DoubanTagSystemProps> = ({ type }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentTag, setCurrentTag] = useState('热门');

  // 定义标签数据
  const movieTags = [
    '热门',
    '最新',
    '经典',
    '豆瓣高分',
    '冷门佳片',
    '华语',
    '欧美',
    '韩国',
    '日本',
  ];

  const tvTags = [
    '热门',
    '美剧',
    '英剧',
    '韩剧',
    '日剧',
    '国产剧',
    '港剧',
    '日本动画',
    '综艺',
    '纪录片',
  ];

  // 根据类型选择标签
  const tags = type === 'movie' ? movieTags : tvTags;

  // 获取当前标签
  useEffect(() => {
    const tag = searchParams.get('tag') || '热门';
    setCurrentTag(tag);
  }, [searchParams]);

  // 处理标签点击
  const handleTagClick = (tag: string) => {
    if (tag !== currentTag) {
      const params = new URLSearchParams(searchParams);
      params.set('tag', tag);
      const newUrl = `/douban?${params.toString()}`;
      router.push(newUrl);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-3">豆瓣标签</h3>
      <div className="flex flex-wrap gap-2">
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
    </div>
  );
};

export default DoubanTagSystem;