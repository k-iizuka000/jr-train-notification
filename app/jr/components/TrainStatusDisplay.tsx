'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { TrainStatus } from '@/types';

interface ApiResponse {
  success: boolean;
  data?: TrainStatus;
  error?: string;
  message?: string;
}

export default function TrainStatusDisplay() {
  const [status, setStatus] = useState<TrainStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());

  // 運行状況を取得
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/jr/status');
      const data: ApiResponse = await response.json();
      
      if (data.success && data.data) {
        setStatus(data.data);
        setError(null);
      } else {
        setError(data.error || '運行状況の取得に失敗しました');
      }
    } catch (err) {
      setError('通信エラーが発生しました');
      console.error('運行状況取得エラー:', err);
    } finally {
      setLoading(false);
      setLastFetchTime(new Date());
    }
  };

  // 初回読み込みと定期更新
  useEffect(() => {
    fetchStatus();
    
    // 1分ごとに更新
    const interval = setInterval(fetchStatus, 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 相対時間を更新（10秒ごと）
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  // 運行状況に応じたスタイルを返す
  const getStatusStyle = () => {
    if (!status) return '';
    
    if (status.status === '平常運転') {
      return 'bg-green-100 border-green-300 text-green-800';
    }
    return 'bg-red-100 border-red-300 text-red-800 animate-pulse';
  };

  // ローディング表示
  if (loading) {
    return (
      <div className="border rounded-lg p-4 sm:p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 sm:w-1/4 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-full sm:w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 sm:w-1/2"></div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="border border-red-300 rounded-lg p-4 sm:p-6 bg-red-50">
        <h2 className="text-lg sm:text-xl font-semibold text-red-800 mb-2">エラー</h2>
        <p className="text-red-600 text-sm sm:text-base">{error}</p>
        <button
          onClick={fetchStatus}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm sm:text-base"
        >
          再試行
        </button>
      </div>
    );
  }

  // 運行状況表示
  return (
    <div className={`border rounded-lg p-4 sm:p-6 transition-all ${getStatusStyle()}`}>
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">現在の運行状況</h2>
        <button
          onClick={fetchStatus}
          className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          title="今すぐ更新"
        >
          更新
        </button>
      </div>
      
      <div className="mb-4">
        <p className="text-lg sm:text-xl font-semibold break-words">
          {status?.status || '情報を取得できません'}
        </p>
        {status?.details && (
          <p className="mt-2 text-gray-700 text-sm sm:text-base">{status.details}</p>
        )}
      </div>
      
      <div className="text-xs sm:text-sm text-gray-600">
        <p>
          最終確認: {' '}
          <time dateTime={lastFetchTime.toISOString()}>
            {formatDistanceToNow(lastFetchTime, { 
              addSuffix: true, 
              locale: ja 
            })}
          </time>
        </p>
        {status?.lastUpdated && (
          <p>
            JR東日本更新: {' '}
            <time dateTime={new Date(status.lastUpdated).toISOString()}>
              {formatDistanceToNow(new Date(status.lastUpdated), { 
                addSuffix: true, 
                locale: ja 
              })}
            </time>
          </p>
        )}
      </div>
    </div>
  );
}