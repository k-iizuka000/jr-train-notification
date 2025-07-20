'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { logger, LogLevel, LogEntry } from '@/lib/logger';
import { errorHandler } from '@/lib/error-handler';
import { getDeviceInfo } from '@/utils/platform-detector';
import { validateVapidPublicKey, getVapidKeyDebugInfo } from '@/utils/vapid-helper';

export default function DebugPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorLogs, setErrorLogs] = useState<ReturnType<typeof errorHandler.getErrorLog>>([]);
  const [statusHistory, setStatusHistory] = useState<ReturnType<typeof logger.getStatusHistory>>([]);
  const [debugInfo, setDebugInfo] = useState<ReturnType<typeof logger.getDebugInfo> | null>(null);
  const [logLevel, setLogLevel] = useState<LogLevel>(LogLevel.INFO);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'errors' | 'history' | 'device' | 'subscriptions'>('logs');
  const [deviceInfo, setDeviceInfo] = useState<ReturnType<typeof getDeviceInfo> | null>(null);
  const [vapidValidation, setVapidValidation] = useState<{
    isValid: boolean;
    error?: string;
    debugInfo: ReturnType<typeof getVapidKeyDebugInfo>;
    publicKey: string;
  } | null>(null);
  const [subscriptions, setSubscriptions] = useState<{
    count: number;
    subscriptions: Array<{
      index: number;
      endpoint: string;
      endpointPreview: string;
      hasKeys: { p256dh: boolean; auth: boolean };
      keysLength: { p256dh: number; auth: number };
    }>;
    timestamp: string;
  } | null>(null);

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
    
    // デバイス情報を取得
    setDeviceInfo(getDeviceInfo());
    
    // VAPID鍵の検証
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (vapidPublicKey) {
      const validation = validateVapidPublicKey(vapidPublicKey);
      const debugInfo = getVapidKeyDebugInfo(vapidPublicKey);
      setVapidValidation({
        ...validation,
        debugInfo,
        publicKey: vapidPublicKey
      });
    }
    
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

  // 購読情報を取得
  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/jr/debug-subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.data);
      } else {
        console.error('購読情報の取得に失敗しました');
      }
    } catch (error) {
      console.error('購読情報取得エラー:', error);
    }
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

  // 開発環境チェックを一時的に無効化（デバッグのため）
  // if (process.env.NODE_ENV !== 'development') {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
  //       <div className="text-center">
  //         <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセスできません</h1>
  //         <p className="text-gray-600 mb-6">このページは開発環境でのみ利用可能です。</p>
  //         <Link href="/jr" className="text-blue-600 hover:text-blue-800 underline">
  //           ホームに戻る
  //         </Link>
  //       </div>
  //     </div>
  //   );
  // }

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
                onClick={() => setActiveTab('logs')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'logs'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                システムログ
              </button>
              <button
                onClick={() => setActiveTab('errors')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'errors'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                エラーログ
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'history'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                状態履歴
              </button>
              <button
                onClick={() => setActiveTab('device')}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'device'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                デバイス情報
              </button>
              <button
                onClick={() => {
                  setActiveTab('subscriptions');
                  fetchSubscriptions();
                }}
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === 'subscriptions'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                購読情報
              </button>
            </nav>
          </div>

          {/* タブコンテンツ */}
          <div className="p-4">
            {activeTab === 'logs' && (
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
                      {log.data !== undefined && log.data !== null && (
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
            )}
            
            {activeTab === 'subscriptions' && (
              <div className="space-y-4">
                {subscriptions ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold">購読情報一覧（{subscriptions.count}件）</h3>
                      <button
                        onClick={fetchSubscriptions}
                        className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        更新
                      </button>
                    </div>
                    
                    {subscriptions.count === 0 ? (
                      <p className="text-gray-500 text-center py-8">購読情報がありません</p>
                    ) : (
                      <div className="space-y-4">
                        {subscriptions.subscriptions.map((sub) => (
                          <div key={sub.index} className="bg-gray-50 p-4 rounded">
                            <h4 className="font-medium mb-2">購読 #{sub.index}</h4>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium">エンドポイント（プレビュー）:</span>
                                <p className="text-xs text-gray-600 break-all">{sub.endpointPreview}</p>
                              </div>
                              <div>
                                <span className="font-medium">完全なエンドポイント:</span>
                                <details className="mt-1">
                                  <summary className="cursor-pointer text-blue-600">表示</summary>
                                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto break-all">
                                    {sub.endpoint}
                                  </pre>
                                </details>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="font-medium">鍵の存在:</span>
                                  <p>p256dh: {sub.hasKeys.p256dh ? '✅' : '❌'}</p>
                                  <p>auth: {sub.hasKeys.auth ? '✅' : '❌'}</p>
                                </div>
                                <div>
                                  <span className="font-medium">鍵の長さ:</span>
                                  <p>p256dh: {sub.keysLength.p256dh}文字</p>
                                  <p>auth: {sub.keysLength.auth}文字</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 text-right">
                      最終更新: {new Date(subscriptions.timestamp).toLocaleString('ja-JP')}
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <button
                      onClick={fetchSubscriptions}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      購読情報を読み込む
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'device' && deviceInfo && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">プラットフォーム情報</h3>
                  <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
                    <p><span className="font-medium">Platform:</span> {deviceInfo.platform}</p>
                    <p><span className="font-medium">iOS:</span> {deviceInfo.isIOS ? 'はい' : 'いいえ'}</p>
                    <p><span className="font-medium">Safari:</span> {deviceInfo.isSafari ? 'はい' : 'いいえ'}</p>
                    <p><span className="font-medium">PWA:</span> {deviceInfo.isStandalone ? 'はい' : 'いいえ'}</p>
                    {deviceInfo.iosVersion && (
                      <p><span className="font-medium">iOS バージョン:</span> {deviceInfo.iosVersion}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">プッシュ通知サポート</h3>
                  <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
                    <p><span className="font-medium">サポート:</span> {deviceInfo.pushSupport.isSupported ? '✅ はい' : '❌ いいえ'}</p>
                    <p><span className="font-medium">Service Worker:</span> {deviceInfo.pushSupport.hasServiceWorker ? '✅' : '❌'}</p>
                    <p><span className="font-medium">Push Manager:</span> {deviceInfo.pushSupport.hasPushManager ? '✅' : '❌'}</p>
                    <p><span className="font-medium">Notification API:</span> {deviceInfo.pushSupport.hasNotificationAPI ? '✅' : '❌'}</p>
                    <p><span className="font-medium">ユーザー操作必須:</span> {deviceInfo.pushSupport.requiresUserInteraction ? 'はい' : 'いいえ'}</p>
                    {deviceInfo.pushSupport.error && (
                      <p className="text-red-600"><span className="font-medium">エラー:</span> {deviceInfo.pushSupport.error}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">VAPID鍵検証</h3>
                  <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
                    {vapidValidation ? (
                      <>
                        <p><span className="font-medium">検証結果:</span> {vapidValidation.isValid ? '✅ 有効' : '❌ 無効'}</p>
                        {vapidValidation.error && (
                          <p className="text-red-600"><span className="font-medium">エラー:</span> {vapidValidation.error}</p>
                        )}
                        <p><span className="font-medium">鍵の長さ:</span> {vapidValidation.debugInfo.length}文字</p>
                        <p><span className="font-medium">文字検証:</span> {vapidValidation.debugInfo.hasValidCharacters ? '✅' : '❌'}</p>
                        {vapidValidation.debugInfo.byteLength && (
                          <p><span className="font-medium">バイト長:</span> {vapidValidation.debugInfo.byteLength}</p>
                        )}
                        {vapidValidation.debugInfo.rawValue && (
                          <p className="break-all"><span className="font-medium">鍵の一部:</span> {vapidValidation.debugInfo.rawValue}</p>
                        )}
                        {vapidValidation.debugInfo.firstChars && vapidValidation.debugInfo.lastChars && (
                          <p className="text-xs text-gray-500">
                            開始: {vapidValidation.debugInfo.firstChars} ... 終了: {vapidValidation.debugInfo.lastChars}
                          </p>
                        )}
                        <p><span className="font-medium">パディング:</span> {vapidValidation.debugInfo.hasPadding ? `あり (${vapidValidation.debugInfo.paddingCount}個の=)` : 'なし'}</p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-blue-600">公開鍵を表示</summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                            {vapidValidation.publicKey}
                          </pre>
                        </details>
                      </>
                    ) : (
                      <p className="text-red-600">VAPID鍵が設定されていません</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">User Agent</h3>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs break-all">{deviceInfo.userAgent}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}