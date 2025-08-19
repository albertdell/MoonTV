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

  // 簡化標籤映射 - 參考LibreTV的直接映射方式
  const tagMapping: { [key: string]: string } = {
    // 電視劇分類映射 - 直接使用豆瓣支持的標籤
    '美剧': '美剧',
    '日剧': '日剧', 
    '韩剧': '韩剧',
    '英剧': '英剧',
    '国产剧': '国产剧',
    '港剧': '港剧',
    '日本动画': '日本动画',
    '日漫': '日本动画',
    '综艺': '综艺',
    '纪录片': '纪录片',
    // 電影分類映射
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
    '冷门佳片': '冷门佳片'
  };

  // 優先級選擇：title > tag，簡化邏輯
  let finalTag = tag;
  
  // 如果有title參數且在映射表中，優先使用title
  if (title && tagMapping[title]) {
    finalTag = tagMapping[title];
  } else if (tagMapping[tag]) {
    finalTag = tagMapping[tag];
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
    
    // 嘗試多個CORS代理服務
    const corsProxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,
      `https://corsproxy.io/?${encodeURIComponent(target)}`,
      `https://cors-anywhere.herokuapp.com/${target}`
    ];
    
    let doubanData = null;
    let lastError: Error | null = null;
    
    for (let i = 0; i < corsProxies.length; i++) {
      try {
        
        const corsResponse = await fetch(corsProxies[i], {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*'
          }
        });
        
        if (!corsResponse.ok) {
          throw new Error(`代理 ${i + 1} 失敗: ${corsResponse.status}`);
        }
        
        if (i === 0) {
          // allorigins.win 格式
          const corsData = await corsResponse.json();
          if (!corsData.contents) {
            throw new Error('allorigins 代理返回格式錯誤');
          }
          doubanData = JSON.parse(corsData.contents);
        } else {
          // 其他代理直接返回JSON
          doubanData = await corsResponse.json();
        }
        
        break;
        
      } catch (error) {
        console.error(`代理 ${i + 1} 失敗:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }
    
    if (!doubanData) {
      throw new Error(`所有代理都失敗，最後錯誤: ${lastError?.message || '未知錯誤'}`);
    }
    
    // 檢查數據格式
    if (!doubanData.subjects || !Array.isArray(doubanData.subjects)) {
      throw new Error('豆瓣 API 返回數據格式錯誤');
    }

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
    console.error('標籤信息:', { originalTag: tag, finalTag: finalTag, title: title });
    
    // 返回更詳細的錯誤信息以便調試
    return NextResponse.json(
      { 
        code: 500,
        message: '获取豆瓣数据失败',
        error: '网络连接问题或豆瓣API限制',
        details: (error as Error).message,
        url: target,
        suggestions: [
          '請檢查網絡連接',
          '豆瓣API可能暫時不可用',
          '嘗試刷新頁面或稍後再試',
          '某些標籤可能不被支持'
        ],
        filters: {
          originalTag: tag,
          finalTag: finalTag,
          title: title,
          year: year,
          region: region,
          genres: genres
        },
        list: [] // 返回空列表而不是錯誤
      },
      { status: 200 } // 改為200狀態碼，避免前端顯示錯誤
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
