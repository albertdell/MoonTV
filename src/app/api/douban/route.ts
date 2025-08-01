import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import { DoubanItem, DoubanResult } from '@/lib/types';

interface DoubanApiResponse {
  subjects: Array<{
    id: string;
    title: string;
    cover: string;
    rate: string;
  }>;
}

async function fetchDoubanData(url: string): Promise<DoubanApiResponse> {
  // 添加超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

  // 设置请求选项，包括信号和头部
  const fetchOptions = {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept: 'application/json, text/plain, */*',
    },
  };

  try {
    // 尝试直接访问豆瓣API
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 获取参数
  const type = searchParams.get('type');
  const tag = searchParams.get('tag');
  const pageSize = parseInt(searchParams.get('pageSize') || '16');
  const pageStart = parseInt(searchParams.get('pageStart') || '0');
  
  // 新增篩選參數
  const year = searchParams.get('year');
  const region = searchParams.get('region');
  const genres = searchParams.get('genres');
  const sort = searchParams.get('sort') || 'recommend';

  // 验证参数
  if (!type || !tag) {
    return NextResponse.json(
      { error: '缺少必要参数: type 或 tag' },
      { status: 400 }
    );
  }

  if (!['tv', 'movie'].includes(type)) {
    return NextResponse.json(
      { error: 'type 参数必须是 tv 或 movie' },
      { status: 400 }
    );
  }

  if (pageSize < 1 || pageSize > 100) {
    return NextResponse.json(
      { error: 'pageSize 必须在 1-100 之间' },
      { status: 400 }
    );
  }

  if (pageStart < 0) {
    return NextResponse.json(
      { error: 'pageStart 不能小于 0' },
      { status: 400 }
    );
  }

  if (tag === 'top250') {
    return handleTop250(pageStart);
  }

  // 參考 LibreTV 的實現 - 簡化篩選邏輯
  // 豆瓣 API 最好的方式是使用單一標籤，而不是組合多個篩選條件
  let finalTag = tag;
  
  // 優先級：類型 > 地區 > 年份 > 原始標籤
  if (genres && genres !== '') {
    const genreList = genres.split(',').filter(g => g.trim() !== '');
    if (genreList.length > 0) {
      finalTag = genreList[0]; // 使用第一個類型
    }
  } else if (region && region !== '') {
    finalTag = region; // 使用地區
  } else if (year && year !== '') {
    finalTag = year; // 使用年份
  }

  const target = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(finalTag)}&sort=${sort}&page_limit=${pageSize}&page_start=${pageStart}`;

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('豆瓣請求 URL:', target);
      console.log('原始標籤:', tag, '最終標籤:', finalTag);
      console.log('篩選參數 - 年份:', year, '地區:', region, '類型:', genres);
    }
    
    // 使用代理服務器調用豆瓣 API
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(target)}`;
    console.log('使用代理 URL:', proxyUrl);
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`代理請求失敗: ${errorData.error || response.statusText}`);
    }
    
    const doubanData = await response.json();

    // 转换数据格式
    const list: DoubanItem[] = doubanData.subjects.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.cover,
      rate: item.rate,
    }));

    const response: DoubanResult = {
      code: 200,
      message: '获取成功',
      list: list,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`豆瓣數據獲取成功: ${list.length} 項目`);
    }

    const cacheTime = getCacheTime();
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}`,
      },
    });
  } catch (error) {
    console.error('豆瓣 API 錯誤:', error);
    console.error('請求 URL:', target);
    console.error('錯誤詳情:', {
      message: (error as Error).message,
      name: (error as Error).name,
      stack: (error as Error).stack
    });
    
    return NextResponse.json(
      { 
        error: '获取豆瓣数据失败', 
        details: (error as Error).message,
        url: target,
        filters: {
          originalTag: tag,
          finalTag: finalTag,
          year: year,
          region: region,
          genres: genres
        }
      },
      { status: 500 }
    );
  }
}

function handleTop250(pageStart: number) {
  const target = `https://movie.douban.com/top250?start=${pageStart}&filter=`;

  // 直接使用 fetch 获取 HTML 页面
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  const fetchOptions = {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      Referer: 'https://movie.douban.com/',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  };

  return fetch(target, fetchOptions)
    .then(async (fetchResponse) => {
      clearTimeout(timeoutId);

      if (!fetchResponse.ok) {
        throw new Error(`HTTP error! Status: ${fetchResponse.status}`);
      }

      // 获取 HTML 内容
      const html = await fetchResponse.text();

      // 通过正则同时捕获影片 id、标题、封面以及评分
      const moviePattern =
        /<div class="item">[\s\S]*?<a[^>]+href="https?:\/\/movie\.douban\.com\/subject\/(\d+)\/"[\s\S]*?<img[^>]+alt="([^"]+)"[^>]*src="([^"]+)"[\s\S]*?<span class="rating_num"[^>]*>([^<]*)<\/span>[\s\S]*?<\/div>/g;
      const movies: DoubanItem[] = [];
      let match;

      while ((match = moviePattern.exec(html)) !== null) {
        const id = match[1];
        const title = match[2];
        const cover = match[3];
        const rate = match[4] || '';

        // 处理图片 URL，确保使用 HTTPS
        const processedCover = cover.replace(/^http:/, 'https:');

        movies.push({
          id: id,
          title: title,
          poster: processedCover,
          rate: rate,
        });
      }

      const apiResponse: DoubanResult = {
        code: 200,
        message: '获取成功',
        list: movies,
      };

      const cacheTime = getCacheTime();
      return NextResponse.json(apiResponse, {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}`,
        },
      });
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          error: '获取豆瓣 Top250 数据失败',
          details: (error as Error).message,
        },
        { status: 500 }
      );
    });
}
