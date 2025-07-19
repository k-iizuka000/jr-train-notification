import { NextRequest } from 'next/server';

// NextRequestのモックを作成するヘルパー
export function createMockNextRequest(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  }
): NextRequest {
  // NextRequestのモック実装
  const mockRequest = {
    url,
    method: options?.method || 'GET',
    headers: new Headers(options?.headers || {}),
    nextUrl: {
      searchParams: new URLSearchParams(new URL(url).search),
      pathname: new URL(url).pathname,
    },
    json: async () => options?.body || {},
  } as unknown as NextRequest;

  return mockRequest;
}

// レスポンスをパースするヘルパー
export async function parseResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}