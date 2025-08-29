/* eslint-disable @typescript-eslint/no-explicit-any,no-console */

import { DoubanResult } from './types';

// 豆瓣分類參數介面
interface DoubanCategoryParams {
  kind: string;
  category: string;
  type: string;
  pageLimit?: number;
  pageStart?: number;
}

// 豆瓣列表參數介面
interface DoubanListParams {
  tag: string;
  type: string;
  pageLimit?: number;
  pageStart?: number;
}

// 豆瓣推薦參數介面
interface DoubanRecommendParams {
  kind: string;
  pageLimit?: number;
  pageStart?: number;
  category?: string;
  format?: string;
  region?: string;
  year?: string;
  platform?: string;
  sort?: string;
  label?: string;
}

/**
 * 獲取豆瓣分類數據
 */
export async function getDoubanCategories(
  params: DoubanCategoryParams
): Promise<DoubanResult> {
  const { kind, category, type, pageLimit = 20, pageStart = 0 } = params;
  
  try {
    const response = await fetch(
      `/api/douban/categories?kind=${kind}&category=${category}&type=${type}&limit=${pageLimit}&start=${pageStart}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('獲取豆瓣分類數據失敗:', error);
    return {
      code: 500,
      message: '獲取數據失敗',
      list: [],
    };
  }
}

/**
 * 獲取豆瓣列表數據
 */
export async function getDoubanList(
  params: DoubanListParams
): Promise<DoubanResult> {
  const { tag, type, pageLimit = 20, pageStart = 0 } = params;
  
  try {
    const response = await fetch(
      `/api/douban?tag=${tag}&type=${type}&pageSize=${pageLimit}&pageStart=${pageStart}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('獲取豆瓣列表數據失敗:', error);
    return {
      code: 500,
      message: '獲取數據失敗',
      list: [],
    };
  }
}

/**
 * 獲取豆瓣推薦數據
 */
export async function getDoubanRecommends(
  params: DoubanRecommendParams
): Promise<DoubanResult> {
  const { 
    kind, 
    pageLimit = 20, 
    pageStart = 0, 
    category = '', 
    format = '', 
    region = '', 
    year = '', 
    platform = '', 
    sort = '', 
    label = '' 
  } = params;
  
  try {
    const queryParams = new URLSearchParams({
      kind,
      limit: pageLimit.toString(),
      start: pageStart.toString(),
    });

    if (category) queryParams.append('category', category);
    if (format) queryParams.append('format', format);
    if (region) queryParams.append('region', region);
    if (year) queryParams.append('year', year);
    if (platform) queryParams.append('platform', platform);
    if (sort) queryParams.append('sort', sort);
    if (label) queryParams.append('label', label);

    const response = await fetch(`/api/douban/recommends?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('獲取豆瓣推薦數據失敗:', error);
    return {
      code: 500,
      message: '獲取數據失敗',
      list: [],
    };
  }
}

/**
 * 簡化版豆瓣數據獲取 - 與現有首頁邏輯兼容
 */
export async function getDoubanData(type: string, tag: string, pageSize = 16): Promise<DoubanResult> {
  return getDoubanList({
    type,
    tag,
    pageLimit: pageSize,
    pageStart: 0,
  });
}