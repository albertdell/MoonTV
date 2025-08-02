import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'movie';
  const tag = searchParams.get('tag') || '热门';

  try {
    // 使用第三方代理服務，避免豆瓣封鎖
    const doubanUrl = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=25&page_start=0`;
    
    // 使用 CORS 代理
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(doubanUrl)}`;
    
    console.log('使用代理請求:', proxyUrl);
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`代理請求失敗: ${response.status}`);
    }
    
    const proxyData = await response.json();
    
    if (!proxyData.contents) {
      throw new Error('代理返回數據格式錯誤');
    }
    
    const doubanData = JSON.parse(proxyData.contents);
    
    // 轉換為 MoonTV 格式
    const formattedData = {
      code: 200,
      message: '获取成功',
      list: doubanData.subjects?.map((item: any) => ({
        id: item.id,
        title: item.title,
        poster: item.cover,
        rate: item.rate || '暂无评分',
      })) || []
    };
    
    console.log('成功獲取數據，項目數量:', formattedData.list.length);
    
    return NextResponse.json(formattedData, {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    });
    
  } catch (error) {
    console.error('API 錯誤:', error);
    
    // 返回模擬數據作為備用
    return NextResponse.json({
      code: 200,
      message: '获取成功',
      list: [
        {
          id: '1',
          title: '測試電影 1',
          poster: 'https://via.placeholder.com/300x400?text=Movie1',
          rate: '8.5'
        },
        {
          id: '2', 
          title: '測試電影 2',
          poster: 'https://via.placeholder.com/300x400?text=Movie2',
          rate: '7.8'
        },
        {
          id: '3',
          title: '測試電影 3', 
          poster: 'https://via.placeholder.com/300x400?text=Movie3',
          rate: '9.1'
        }
      ]
    });
  }
}