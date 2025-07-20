import { NextRequest } from 'next/server';
import { createApiResponse } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const now = new Date();
  const japanTime = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);

  console.log(`[CRON TEST] GET request received at ${japanTime}`);
  console.log('[CRON TEST] Headers:', Object.fromEntries(request.headers.entries()));
  console.log('[CRON TEST] URL:', request.url);
  
  return createApiResponse({
    message: 'Cron test endpoint called',
    timestamp: now.toISOString(),
    japanTime,
    headers: Object.fromEntries(request.headers.entries()),
    url: request.url
  });
}