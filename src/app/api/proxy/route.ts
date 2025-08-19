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

  // 多重代理服務列表 - 參考LibreTV的實現
  const proxyServices = [
    // 直接請求
    {
      name: 'direct',
      url: decodeURIComponent(targetUrl),
      transform: (data: any) => data
    },
    // 備用代理服務1
    {
      name: 'allorigins',
      url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
      transform: (data: any) => data.contents ? JSON.parse(data.contents) : data
    },
    // 備用代理服務2
    {
      name: 'cors-anywhere',
      url: `https://cors-anywhere.herokuapp.com/${decodeURIComponent(targetUrl)}`,
      transform: (data: any) => data
    },
    // 備用代理服務3
    {
      name: 'thingproxy',
      url: `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(targetUrl)}`,
      transform: (data: any) => data
    }
  ];

  let lastError: Error | null = null;

  // 依次嘗試每個代理服務
  for (const proxy of proxyServices) {
    try {
      console.log(`嘗試代理服務: ${proxy.name}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超時

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      };

      // 只對直接請求添加Referer
      if (proxy.name === 'direct') {
        headers['Referer'] = 'https://movie.douban.com/';
      }

      const response = await fetch(proxy.url, {
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const rawData = await response.json();
      const data = proxy.transform(rawData);
      
      console.log(`代理服務 ${proxy.name} 成功，數據長度:`, JSON.stringify(data).length);

      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5分鐘緩存
          'X-Proxy-Service': proxy.name, // 標記使用的代理服務
        },
      });

    } catch (error) {
      console.error(`代理服務 ${proxy.name} 失敗:`, error);
      lastError = error as Error;
      continue; // 嘗試下一個代理服務
    }
  }

  // 所有代理服務都失敗
  console.error('所有代理服務都失敗');
  
  return NextResponse.json(
    { 
      error: '所有代理服務都失敗', 
      details: lastError?.message || '未知錯誤',
      targetUrl: targetUrl,
      triedServices: proxyServices.map(p => p.name)
    },
    { status: 500 }
  );
}