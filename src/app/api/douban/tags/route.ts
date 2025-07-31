import { NextResponse } from 'next/server';

// 獲取豆瓣官方標籤 API - 參考 LibreTV 的實現
export const runtime = 'edge';

interface DoubanTagsResponse {
  tags: string[];
}

async function fetchDoubanTags(type: 'movie' | 'tv'): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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
    // 使用代理服務器調用豆瓣標籤 API
    const url = `https://movie.douban.com/j/search_tags?type=${type}`;
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`代理請求失敗: ${response.status}`);
    }

    const data: DoubanTagsResponse = await response.json();
    return data.tags || [];
  } catch (error) {
    clearTimeout(timeoutId);
    if (process.env.NODE_ENV === 'development') {
      console.error('獲取豆瓣標籤失敗:', error);
    }
    
    // 返回默認標籤作為備用
    if (type === 'movie') {
      return ['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '治愈'];
    } else {
      return ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片'];
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'movie' | 'tv';

  if (!type || !['movie', 'tv'].includes(type)) {
    return NextResponse.json(
      { error: 'type 参数必须是 movie 或 tv' },
      { status: 400 }
    );
  }

  try {
    const tags = await fetchDoubanTags(type);
    
    return NextResponse.json({
      code: 200,
      message: '获取成功',
      data: {
        type,
        tags
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // 緩存1小時
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('豆瓣標籤 API 錯誤:', error);
    }
    return NextResponse.json(
      { error: '获取豆瓣标签失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}