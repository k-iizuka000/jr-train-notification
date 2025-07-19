'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { logger, LogLevel, LogEntry } from '@/lib/logger';
import { errorHandler } from '@/lib/error-handler';

export default function DebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.INFO);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // データを更新
  const refreshData = () => {
    setLogs(logger.getLogs(undefined, 50));
    setErrorLogs(errorHandler.getErrorLog(20));
    setStatusHistory(logger.getStatusHistory(20));
    setDebugInfo(logger.getDebugInfo());
  };

  // 定期更新
  useEffect(() => {
    refreshData();
    
    if (autoRefresh) {
      const interval = setInterval(refreshData, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // ログレベルの変更
  const handleLogLevelChange = (level: LogLevel) => {
    setLogLevel(level);
    logger.setLogLevel(level);
  };

  // ログのエクスポート
  const exportLogs = () => {
    const csv = logger.exportLogsAsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jr-logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ログレベルのカラー
  const getLogLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG: return 'text-gray-600';
      case LogLevel.INFO: return 'text-blue-600';
      case LogLevel.WARN: return 'text-yellow-600';
      case LogLevel.ERROR: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // 開発環境でのみ表示
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセスできません</h1>
          <p className="text-gray-600 mb-6">このページは開発環境でのみ利用可能です。</p>
          <Link href="/jr" className="text-blue-600 hover:text-blue-800 underline">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/jr" className="text-blue-600 hover:text-blue-800 underline text-sm">
            ← ホームに戻る
          </Link>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-6">デバッグコンソール</h1>

        {/* コントロール */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">ログレベル:</label>
              <select
                value={logLevel}
                onChange={(e) => handleLogLevelChange(Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={LogLevel.DEBUG}>DEBUG</option>
                <option value={LogLevel.INFO}>INFO</option>
                <option value={LogLevel.WARN}>WARN</option>
                <option value={LogLevel.ERROR}>ERROR</option>
              </select>
            </div>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">自動更新</span>
            </label>

            <button
              onClick={refreshData}
              className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              更新
            </button>

            <button
              onClick={exportLogs}
              className="px-4 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              ログをエクスポート
            </button>

            <button
              onClick={() => {
                logger.clearLogs();
                refreshData();
              }}
              className="px-4 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              ログをクリア
            </button>
          </div>
        </div>

        {/* デバッグ情報サマリー */}
        {debugInfo && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">システム状態</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">総ログ数</p>
                <p className="text-xl font-semibold">{debugInfo.totalLogs}</p>
              </div>
              {Object.entries(debugInfo.logsByLevel).map(([level, count]) => (
                <div key={level}>
                  <p className="text-sm text-gray-600">{level}</p>
                  <p className="text-xl font-semibold">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* タブ */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b">
            <nav className="flex -mb-px">
              <button
                className="px-6 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
              >
                システムログ
              </button>
              <button
                className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                エラーログ
              </button>
              <button
                className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                状態履歴
              </button>
            </nav>
          </div>

          {/* ログ表示 */}
          <div className="p-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">ログがありません</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono">
                    <span className="text-gray-500">
                      {log.timestamp.toLocaleTimeString('ja-JP')}
                    </span>
                    {' '}
                    <span className={`font-semibold ${getLogLevelColor(log.level)}`}>
                      [{LogLevel[log.level]}]
                    </span>
                    {log.context && (
                      <>
                        {' '}
                        <span className="text-purple-600">[{log.context}]</span>
                      </>
                    )}
                    {' '}
                    <span className="text-gray-800">{log.message}</span>
                    {log.data && (
                      <details className="ml-4 mt-1">
                        <summary className="cursor-pointer text-gray-600">データ</summary>
                        <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}