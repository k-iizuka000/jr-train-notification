import { NextRequest, NextResponse } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';
import { createApiResponse, createApiError } from '@/lib/api-helpers';

// Vercel Runtime設定
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('=== デバッグ: 購読情報一覧取得 ===');
    
    // すべての購読情報を取得
    const subscriptions = await subscriptionStore.getAllSubscriptions();
    const count = await subscriptionStore.getCount();
    
    console.log(`現在の購読数: ${count}`);
    
    // エンドポイントのリストを作成
    const endpoints = subscriptions.map((sub, index) => ({
      index: index + 1,
      endpoint: sub.endpoint,
      endpointPreview: `${sub.endpoint.substring(0, 50)}...`,
      hasKeys: {
        p256dh: !!sub.keys?.p256dh,
        auth: !!sub.keys?.auth
      },
      keysLength: {
        p256dh: sub.keys?.p256dh?.length || 0,
        auth: sub.keys?.auth?.length || 0
      }
    }));
    
    return createApiResponse({
      count,
      subscriptions: endpoints,
      timestamp: new Date().toISOString()
    }, 200, {
      'Content-Type': 'application/json',
    });

  } catch (error) {
    console.error('デバッグ情報取得エラー:', error);
    
    return createApiError(
      'DEBUG_ERROR',
      error instanceof Error ? error.message : 'デバッグ情報の取得に失敗しました。',
      500,
      {
        'Content-Type': 'application/json',
      }
    );
  }
}

// OPTIONS メソッドの処理（CORS対応）
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}