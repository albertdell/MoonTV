import { NextResponse } from 'next/server';

// 測試豆瓣 API 連接的簡單端點
export const runtime = 'edge';

export async function GET() {
  console.log('開始測試豆瓣 API 連接...');
  
  // 測試最簡單的豆瓣 API 調用
  const testUrl = 'https://movie.douban.com/j/search_subjects?type=movie&tag=热门&sort=recommend&page_limit=5&page_start=0';
  
  try {
    console.log('測試 URL:', testUrl);
    
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': 'https://movie.douban.com/',
        'Accept': 'application/json, text/plain, */*',
      },
    });
    
    console.log('響應狀態:', response.status);
    console.log('響應頭:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('錯誤響應內容:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('成功獲取數據:', data);
    
    return NextResponse.json({
      success: true,
      message: '豆瓣 API 連接成功',
      data: data,
      testUrl: testUrl
    });
    
  } catch (error) {
    console.error('測試失敗:', error);
    
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      testUrl: testUrl,
      details: {
        name: (error as Error).name,
        stack: (error as Error).stack
      }
    }, { status: 500 });
  }
}