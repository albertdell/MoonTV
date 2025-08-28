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

// 改進的代理服務策略
async function fetchWithProxy(url: string): Promise<DoubanApiResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 增加超時時間

  // 更穩定的代理服務列表
  const proxyServices = [
    // 方案1: 嘗試直接調用（在某些環境可能工作）
    {
      name: 'direct',
      url: url,
      transform: (data: any) => data,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://movie.douban.com/',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      } as Record<string, string>
    },
    // 方案2: allorigins (通常最穩定)
    {
      name: 'allorigins',
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      transform: (data: any) => {
        if (!data.contents) throw new Error('allorigins 返回格式錯誤');
        return JSON.parse(data.contents);
      },
      headers: {
        'Accept': 'application/json',
      } as Record<string, string>
    },
    // 方案3: 備用代理
    {
      name: 'corsproxy',
      url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
      transform: (data: any) => data,
      headers: {
        'Accept': 'application/json',
      } as Record<string, string>
    }
  ];

  let lastError: Error | null = null;

  for (const proxy of proxyServices) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`嘗試代理服務: ${proxy.name}`);
      }
      
      const response = await fetch(proxy.url, {
        signal: controller.signal,
        headers: proxy.headers,
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();
      const transformedData = proxy.transform(rawData);
      
      // 驗證數據格式
      if (!transformedData.subjects || !Array.isArray(transformedData.subjects)) {
        throw new Error('返回數據格式不正確');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`代理服務 ${proxy.name} 成功，獲取 ${transformedData.subjects.length} 項數據`);
      }
      clearTimeout(timeoutId);
      return transformedData;

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`代理服務 ${proxy.name} 失敗:`, error);
      }
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  clearTimeout(timeoutId);
  throw new Error(`所有代理服務都失敗，最後錯誤: ${lastError?.message || '未知錯誤'}`);
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
  const _year = searchParams.get('year');
  const _region = searchParams.get('region');
  const _genres = searchParams.get('genres');
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

  // 改進的標籤映射 - 基於實際測試結果
  function getValidDoubanTag(tag: string, type: 'movie' | 'tv'): string {
    // 直接映射表 - 基於豆瓣實際支持的標籤
    const tagMapping: { [key: string]: string } = {
      // 電視劇分類 - 確保與豆瓣 API 完全匹配
      '美剧': '美剧',
      '日剧': '日剧', 
      '韩剧': '韩剧',
      '英剧': '英剧',
      '国产剧': '国产剧',
      '港剧': '港剧',
      '日本动画': '日本动画',
      '日漫': '日本动画', // 映射到豆瓣支持的標籤
      '综艺': '综艺',
      '纪录片': '纪录片',
      
      // 電影分類
      '华语': '华语',
      '欧美': '欧美',
      '韩国': '韩国',
      '日本': '日本',
      '动作': '动作',
      '喜剧': '喜剧',
      '爱情': '爱情',
      '科幻': '科幻',
      '悬疑': '悬疑',
      '恐怖': '恐怖',
      '治愈': '治愈',
      '豆瓣高分': '豆瓣高分',
      
      // 通用標籤
      '热门': '热门',
      '最新': '最新',
      '经典': '经典',
      '冷门佳片': '冷门佳片',
      
      // 細分標籤
      '剧情': '剧情',
      '动画': '动画',
      '犯罪': '犯罪',
      '奇幻': '奇幻',
      '惊悚': '惊悚',
      '家庭': '家庭',
      '战争': '战争',
      '音乐': '音乐',
      '历史': '历史',
      '传记': '传记',
      '运动': '运动',
      '西部': '西部',
      '短片': '短片',
    };

    // 如果標籤在映射表中，返回映射值
    if (tagMapping[tag]) {
      return tagMapping[tag];
    }

    // 如果不在映射表中，直接返回原標籤（豆瓣可能支持）
    return tag;
  }

  // 使用改進的標籤映射
  const finalTag = getValidDoubanTag(tag, type as 'movie' | 'tv');

  const target = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(finalTag)}&sort=${sort}&page_limit=${pageSize}&page_start=${pageStart}`;

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('請求豆瓣 API:', target);
      console.log('標籤映射:', { original: tag, final: finalTag, title });
    }

    const doubanData = await fetchWithProxy(target);

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

    if (process.env.NODE_ENV === 'development') {
      console.log(`成功獲取 ${list.length} 項數據`);
    }

    const cacheTime = getCacheTime();
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, max-age=${cacheTime}`,
        'X-Douban-Tag': finalTag,
        'X-Original-Tag': tag,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('豆瓣 API 錯誤:', error);
      console.error('請求 URL:', target);
      console.error('標籤信息:', { originalTag: tag, finalTag, title });
    }
    
    // 返回詳細錯誤信息但不中斷用戶體驗
    return NextResponse.json(
      { 
        code: 200, // 保持 200 狀態碼避免前端錯誤處理
        message: '获取数据时遇到问题',
        error: '网络连接问题或豆瓣API限制',
        details: (error as Error).message,
        list: [], // 返回空列表
        debug: {
          url: target,
          originalTag: tag,
          finalTag,
          title,
          timestamp: new Date().toISOString()
        }
      },
      { status: 200 }
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