import type { TrainStatus } from '@/types';

// 開発環境用のモックデータ
const mockStatuses = [
  '平常運転',
  '遅延：大宮～上尾駅間で発生した人身事故の影響で、一部列車に遅れが出ています。',
  '運転見合わせ：強風の影響により、高崎～籠原駅間で運転を見合わせています。',
  '平常運転',
  '遅延：車両点検の影響で、上下線で約10分の遅れが発生しています。'
];

let currentIndex = 0;

export async function scrapeTrainStatusMock(): Promise<TrainStatus> {
  // ランダムな遅延をシミュレート
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  
  // 状態を順番に切り替える（デモ用）
  const status = mockStatuses[currentIndex];
  currentIndex = (currentIndex + 1) % mockStatuses.length;
  
  return {
    status,
    lastUpdated: new Date(),
    isNormal: status.includes('平常運転')
  };
}

// キャッシュ機能（モック版）
interface CachedStatus {
  data: TrainStatus;
  timestamp: number;
}

let statusCache: CachedStatus | null = null;
const CACHE_DURATION = 60000; // 1分間キャッシュ

export async function getTrainStatusMock(useCache: boolean = true): Promise<TrainStatus> {
  // キャッシュが有効な場合
  if (useCache && statusCache) {
    const now = Date.now();
    if (now - statusCache.timestamp < CACHE_DURATION) {
      return statusCache.data;
    }
  }
  
  // 新しいデータを取得
  const status = await scrapeTrainStatusMock();
  
  // キャッシュを更新
  statusCache = {
    data: status,
    timestamp: Date.now()
  };
  
  return status;
}