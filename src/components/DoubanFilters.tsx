'use client';

import { useState } from 'react';

interface FilterOptions {
  year: string;
  region: string;
  genres: string[];
  sort: string;
}

interface DoubanFiltersProps {
  type: string;
  onFiltersChange: (filters: FilterOptions) => void;
  hideRegion?: boolean; // 美劇、韓劇、日劇、日漫不顯示地區選項
}

const YEARS = [
  { value: '', label: '全部年代' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: '2020', label: '2020' },
  { value: '2010年代', label: '2010年代' },
  { value: '2000年代', label: '2000年代' },
  { value: '90年代', label: '90年代' },
  { value: '80年代', label: '80年代' },
  { value: '更早', label: '更早' },
];

const REGIONS = [
  { value: '', label: '全部地區' },
  { value: '中国大陆', label: '中國大陸' },
  { value: '美国', label: '美國' },
  { value: '香港', label: '香港' },
  { value: '台湾', label: '台灣' },
  { value: '日本', label: '日本' },
  { value: '韩国', label: '韓國' },
  { value: '英国', label: '英國' },
  { value: '法国', label: '法國' },
  { value: '德国', label: '德國' },
  { value: '意大利', label: '意大利' },
  { value: '西班牙', label: '西班牙' },
  { value: '印度', label: '印度' },
  { value: '泰国', label: '泰國' },
  { value: '俄罗斯', label: '俄羅斯' },
  { value: '伊朗', label: '伊朗' },
  { value: '加拿大', label: '加拿大' },
  { value: '澳大利亚', label: '澳大利亞' },
  { value: '爱尔兰', label: '愛爾蘭' },
  { value: '瑞典', label: '瑞典' },
  { value: '巴西', label: '巴西' },
  { value: '丹麦', label: '丹麥' },
];

const MOVIE_GENRES = [
  { value: '剧情', label: '劇情' },
  { value: '喜剧', label: '喜劇' },
  { value: '动作', label: '動作' },
  { value: '爱情', label: '愛情' },
  { value: '科幻', label: '科幻' },
  { value: '动画', label: '動畫' },
  { value: '悬疑', label: '懸疑' },
  { value: '惊悚', label: '驚悚' },
  { value: '恐怖', label: '恐怖' },
  { value: '犯罪', label: '犯罪' },
  { value: '同性', label: '同性' },
  { value: '音乐', label: '音樂' },
  { value: '歌舞', label: '歌舞' },
  { value: '传记', label: '傳記' },
  { value: '历史', label: '歷史' },
  { value: '战争', label: '戰爭' },
  { value: '西部', label: '西部' },
  { value: '奇幻', label: '奇幻' },
  { value: '冒险', label: '冒險' },
  { value: '灾难', label: '災難' },
  { value: '武侠', label: '武俠' },
  { value: '情色', label: '情色' },
];

const TV_GENRES = [
  { value: '剧情', label: '劇情' },
  { value: '喜剧', label: '喜劇' },
  { value: '爱情', label: '愛情' },
  { value: '动作', label: '動作' },
  { value: '科幻', label: '科幻' },
  { value: '动画', label: '動畫' },
  { value: '悬疑', label: '懸疑' },
  { value: '惊悚', label: '驚悚' },
  { value: '恐怖', label: '恐怖' },
  { value: '犯罪', label: '犯罪' },
  { value: '同性', label: '同性' },
  { value: '历史', label: '歷史' },
  { value: '战争', label: '戰爭' },
  { value: '古装', label: '古裝' },
  { value: '武侠', label: '武俠' },
  { value: '青春', label: '青春' },
  { value: '都市', label: '都市' },
  { value: '家庭', label: '家庭' },
  { value: '儿童', label: '兒童' },
  { value: '励志', label: '勵志' },
  { value: '搞笑', label: '搞笑' },
  { value: '偶像', label: '偶像' },
  { value: '时装', label: '時裝' },
  { value: '商战', label: '商戰' },
  { value: '网剧', label: '網劇' },
];

const SORT_OPTIONS = [
  { value: 'recommend', label: '推薦排序' },
  { value: 'time', label: '時間排序' },
  { value: 'rank', label: '評分排序' },
];

export default function DoubanFilters({ 
  type, 
  onFiltersChange, 
  hideRegion = false 
}: DoubanFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    year: '',
    region: '',
    genres: [],
    sort: 'recommend',
  });

  const genres = type === 'movie' ? MOVIE_GENRES : TV_GENRES;

  const handleFilterChange = (key: keyof FilterOptions, value: string | string[]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleGenreToggle = (genre: string) => {
    const newGenres = filters.genres.includes(genre)
      ? filters.genres.filter(g => g !== genre)
      : [...filters.genres, genre];
    handleFilterChange('genres', newGenres);
  };

  const resetFilters = () => {
    const resetFilters = {
      year: '',
      region: '',
      genres: [],
      sort: 'recommend',
    };
    setFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          篩選條件
        </h3>
        <button
          onClick={resetFilters}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          重置
        </button>
      </div>

      <div className="space-y-4">
        {/* 年份選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            年份
          </label>
          <select
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {YEARS.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>

        {/* 地區選擇 - 條件顯示 */}
        {!hideRegion && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              地區
            </label>
            <select
              value={filters.region}
              onChange={(e) => handleFilterChange('region', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {REGIONS.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 類型選擇 - 複選核取方塊 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            類型
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {genres.map((genre) => (
              <label
                key={genre.value}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={filters.genres.includes(genre.value)}
                  onChange={() => handleGenreToggle(genre.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {genre.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 排序選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            排序
          </label>
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}