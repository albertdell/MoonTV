'use client';

import { useState } from 'react';

interface FilterOptions {
  sort: string;
}

interface DoubanFiltersProps {
  type: string;
  onFiltersChange: (filters: FilterOptions) => void;
}

const SORT_OPTIONS = [
  { value: 'recommend', label: '推薦排序' },
  { value: 'time', label: '時間排序' },
  { value: 'rank', label: '評分排序' },
];

export default function DoubanFilters({ 
  type, 
  onFiltersChange
}: DoubanFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    sort: 'recommend',
  });

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">排序</h3>
      </div>
      
      <div className="w-full max-w-xs">
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
  );
}