import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  console.log('測試 API 被調用');
  
  try {
    // 直接測試豆瓣 API
    const testUrl = 'https://movie.douban.com/j/search_subjects?type=movie&tag=热门&sort=recommend&page_limit=5&page_start=0';
    console.log('直接測試豆瓣 URL:', testUrl);
    
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://movie.douban.com/',
        'Accept': 'application/json, text/plain, */*',
      },
    });
    
    console.log('豆瓣響應狀態:', response.status);
    
    if (!response.ok) {
      throw new Error(`豆瓣 API 錯誤: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('豆瓣返回數據:', data);
    
    return NextResponse.json({
      success: true,
      message: '豆瓣 API 測試成功',
      data: data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('豆瓣 API 測試失敗:', error);
    
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}