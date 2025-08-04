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

async function _fetchDoubanData(url: string): Promise<DoubanApiResponse> {
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

  // 獲取參數
  const type = searchParams.get('type');
  const tag = searchParams.get('tag');
  const title = searchParams.get('title'); // 獲取分類標題
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

  // 參考 LibreTV 的實現 - 建立正確的標籤映射
  let finalTag = tag;
  
  // 特殊標籤映射 - 解決美劇、日劇、日漫等分類問題
  const tagMapping: { [key: string]: string } = {
    // 電視劇分類映射
    '美剧': '美剧',
    '韩剧': '韩剧', 
    '日剧': '日剧',
    '国产剧': '国产剧',
    '港剧': '港剧',
    '英剧': '英剧',
    '日本动画': '日本动画',
    '日漫': '日本动画', // 日漫映射到日本动画
    '综艺': '综艺',
    '纪录片': '纪录片',
    
    // 電影分類映射
    '热门': '热门',
    '最新': '最新',
    '经典': '经典',
    '豆瓣高分': '豆瓣高分',
    '冷门佳片': '冷门佳片',
    '华语': '华语',
    '欧美': '欧美',
    '韩国': '韩国',
    '日本': '日本',
    
    // 類型標籤
    '动作': '动作',
    '喜剧': '喜剧',
    '爱情': '爱情',
    '科幻': '科幻',
    '悬疑': '悬疑',
    '恐怖': '恐怖',
    '治愈': '治愈',
    '剧情': '剧情',
    '奇幻': '奇幻',
    '动画': '动画'
  };
  
  // 使用映射表獲取正確的標籤
  finalTag = tagMapping[tag] || tag;
  
  // 特殊處理：如果有 title 參數，說明是在特定分類下
  // 需要組合分類和標籤來獲取正確的結果
  if (title && type === 'tv') {
    // 對於電視劇的特定分類，組合查詢
    const categoryMapping: { [key: string]: string } = {
      '日漫': '日本动画',
      '美剧': '美剧',
      '韩剧': '韩剧',
      '日剧': '日剧',
      '综艺': '综艺',
      '英剧': '英剧',
      '国产剧': '国产剧',
      '港剧': '港剧',
      '纪录片': '纪录片'
    };
    
    const categoryTag = categoryMapping[title] || title;
    
    // 如果標籤不是 "热门"，嘗試組合查詢
    if (tag !== '热门' && tag !== categoryTag) {
      // 對於用戶創建的標籤，組合分類和標籤
      finalTag = `${categoryTag} ${tag}`;
    } else {
      finalTag = categoryTag;
    }
  }
  
  // 優先級：類型 > 地區 > 年份 > 映射標籤
  if (genres && genres !== '') {
    const genreList = genres.split(',').filter(g => g.trim() !== '');
    if (genreList.length > 0) {
      finalTag = tagMapping[genreList[0]] || genreList[0];
    }
  } else if (region && region !== '') {
    finalTag = tagMapping[region] || region;
  } else if (year && year !== '') {
    finalTag = year; // 年份不需要映射
  }

  const target = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(finalTag)}&sort=${sort}&page_limit=${pageSize}&page_start=${pageStart}`;

  try {
    // 緊急修復：使用第三方 CORS 代理
    const corsProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`;
    console.log('使用 CORS 代理:', corsProxyUrl);
    
    const corsResponse = await fetch(corsProxyUrl);
    
    if (!corsResponse.ok) {
      throw new Error(`CORS 代理失敗: ${corsResponse.status}`);
    }
    
    const corsData = await corsResponse.json();
    
    if (!corsData.contents) {
      throw new Error('CORS 代理返回格式錯誤');
    }
    
    const doubanData = JSON.parse(corsData.contents);

    // 转换数据格式
    const list: DoubanItem[] = doubanData.subjects.map((item: any) => ({
      id: item.id,
      title: item.title,
      poster: item.cover,
      rate: item.rate,
    }));

    const result: DoubanResult = {
      code: 200,
      message: '获取成功',
      list: list,
    };

    // 數據獲取成功

    const cacheTime = getCacheTime();
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}`,
      },
    });
  } catch (error) {
    console.error('豆瓣 API 錯誤:', error);
    console.error('請求 URL:', target);
    
    return NextResponse.json(
      { 
        error: '获取豆瓣数据失败', 
        details: (error as Error).message,
        url: target,
        filters: {
          originalTag: tag,
          finalTag: finalTag,
          title: title,
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

      const top250Result: DoubanResult = {
        code: 200,
        message: '获取成功',
        list: movies,
      };

      const cacheTime = getCacheTime();
      return NextResponse.json(top250Result, {
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
