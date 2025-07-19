'use client';

import { useEffect, useState } from 'react';
import type { ApiResponse, TrainStatusResponse } from '@/types';
import { formatLastUpdated } from '@/lib/utils';

export default function TrainStatusDisplay() {
  const [status, setStatus] = useState<TrainStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrainStatus();
    
    // 1分ごとに自動更新
    const interval = setInterval(fetchTrainStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  async function fetchTrainStatus() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/jr/status');
      const data: ApiResponse<TrainStatusResponse> = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'データの取得に失敗しました');
      }
      
      setStatus(data.data!);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !status) {
    return (
      <div className="bg-gray-100 p-6 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <p className="text-red-600 font-semibold">エラー</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={fetchTrainStatus}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          再試行
        </button>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const statusClass = status.isNormal
    ? 'bg-green-50 border-green-200'
    : 'bg-yellow-50 border-yellow-200';

  const statusTextClass = status.isNormal
    ? 'text-green-800'
    : 'text-yellow-800';

  const lastUpdatedDate = new Date(status.lastUpdated);
  const formattedTime = formatLastUpdated(lastUpdatedDate);

  return (
    <div className={`border p-6 rounded-lg ${statusClass}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className={`font-bold text-lg ${statusTextClass}`}>
            {status.isNormal ? '✓ ' : '⚠ '}
            運行状況
          </p>
          <p className={`mt-2 ${statusTextClass}`}>
            {status.status}
          </p>
        </div>
        {loading && (
          <div className="ml-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          最終更新: {formattedTime}
        </p>
        <button
          onClick={fetchTrainStatus}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
          disabled={loading}
        >
          今すぐ更新
        </button>
      </div>
    </div>
  );
}