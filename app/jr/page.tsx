import Link from 'next/link';
import TrainStatusDisplay from './components/TrainStatusDisplay';
import NotificationSettings from './components/NotificationSettings';
import ErrorBoundary from '@/app/components/ErrorBoundary';

export default function JRPage() {
  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            ← トップページに戻る
          </Link>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">JR高崎線運行情報</h1>
        
        <div className="space-y-6">
          <ErrorBoundary context="TrainStatusDisplay">
            <TrainStatusDisplay />
          </ErrorBoundary>
          
          <ErrorBoundary context="NotificationSettings">
            <NotificationSettings />
          </ErrorBoundary>
        </div>
        
        <div className="mt-6 sm:mt-8 text-xs sm:text-sm text-gray-600 space-y-1">
          <p>※ 運行情報は1分ごとに自動更新されます</p>
          <p>※ JR東日本の公式サイトから取得した情報を表示しています</p>
          <p>※ 平日の朝7:00と夕方17:00に定期チェックを行います</p>
        </div>
      </div>
    </main>
  );
}