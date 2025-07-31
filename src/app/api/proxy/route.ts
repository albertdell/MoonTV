import { NextResponse } from 'next/server';

// 代理服務器 - 參考 LibreTV 的實現
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json(
      { error: '缺少目標 URL 參數' },
      { status: 400 }
    );
  }

  // 驗證目標 URL 是否為豆瓣域名
  try {
    const url = new URL(decodeURIComponent(targetUrl));
    if (!url.hostname.includes('douban.com')) {
      return NextResponse.json(
        { error: '不允許的目標域名' },
        { status: 403 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: '無效的 URL 格式' },
      { status: 400 }
    );
  }

  console.log('代理請求目標:', targetUrl);

  try {
    // 添加超時控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(decodeURIComponent(targetUrl), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://movie.douban.com/',
        'Accept': 'application/json, text/plain, */*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('代理請求成功，數據長度:', JSON.stringify(data).length);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5分鐘緩存
      },
    });

  } catch (error) {
    console.error('代理請求失敗:', error);
    
    // 嘗試備用代理服務
    try {
      console.log('嘗試備用代理服務...');
      const fallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      
      const fallbackResponse = await fetch(fallbackUrl);
      
      if (!fallbackResponse.ok) {
        throw new Error(`備用代理失敗! 狀態: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      
      if (fallbackData && fallbackData.contents) {
        const parsedData = JSON.parse(fallbackData.contents);
        console.log('備用代理成功');
        
        return NextResponse.json(parsedData, {
          headers: {
            'Cache-Control': 'public, max-age=300',
          },
        });
      } else {
        throw new Error('備用代理無法獲取有效數據');
      }
      
    } catch (fallbackError) {
      console.error('備用代理也失敗:', fallbackError);
      
      return NextResponse.json(
        { 
          error: '代理請求失敗', 
          details: (error as Error).message,
          fallbackError: (fallbackError as Error).message,
          targetUrl: targetUrl
        },
        { status: 500 }
      );
    }
  }
}