import { getTrainStatus } from './scraper';
import { subscriptionStore } from './subscription-store';
import { sendPushNotificationToAll, createStatusChangeNotification } from './push-notification';
import type { TrainStatus } from '@/types';

// 運行状況の状態管理
interface StatusState {
  lastStatus: string | null;
  lastCheckTime: Date | null;
  isDelayed: boolean;
  lastNotificationTime: Date | null;
  delayCheckInterval: NodeJS.Timeout | null;
}

// グローバル状態（本番環境では外部ストレージを使用）
let statusState: StatusState = {
  lastStatus: null,
  lastCheckTime: null,
  isDelayed: false,
  lastNotificationTime: null,
  delayCheckInterval: null
};

// 通知の重複防止期間（5分）
const NOTIFICATION_COOLDOWN = 5 * 60 * 1000;

// 遅延時の監視間隔（30分）
const DELAY_CHECK_INTERVAL = 30 * 60 * 1000;

/**
 * 運行状況をチェックして必要に応じて通知を送信
 */
export async function checkTrainStatusAndNotify(): Promise<{
  status: string;
  notificationSent: boolean;
  error?: string;
}> {
  try {
    console.log('[Scheduler] 運行状況チェック開始:', new Date().toLocaleString('ja-JP'));
    
    // 現在の運行状況を取得
    const currentStatus = await getTrainStatus();
    const now = new Date();
    
    console.log('[Scheduler] 現在の運行状況:', currentStatus.status);
    console.log('[Scheduler] 前回の運行状況:', statusState.lastStatus);
    
    // 状態に変化があるかチェック
    const hasStatusChanged = statusState.lastStatus !== null && 
                           statusState.lastStatus !== currentStatus.status;
    
    // 通知送信の判定
    let shouldNotify = false;
    let notificationTitle = '';
    let isRecovered = false;
    
    if (hasStatusChanged) {
      // 通知クールダウン期間をチェック
      const timeSinceLastNotification = statusState.lastNotificationTime 
        ? now.getTime() - statusState.lastNotificationTime.getTime()
        : Infinity;
        
      if (timeSinceLastNotification >= NOTIFICATION_COOLDOWN) {
        if (currentStatus.status === '平常運転' && statusState.isDelayed) {
          // 遅延から復旧
          shouldNotify = true;
          isRecovered = true;
          notificationTitle = '🚃 JR高崎線: 平常運転に復旧しました';
          console.log('[Scheduler] 平常運転に復旧しました');
        } else if (currentStatus.status !== '平常運転' && !statusState.isDelayed) {
          // 新たな遅延発生
          shouldNotify = true;
          notificationTitle = '🚃 JR高崎線: 運行状況に変化があります';
          console.log('[Scheduler] 運行に支障が発生しました');
        }
      } else {
        console.log('[Scheduler] クールダウン期間中のため通知をスキップ');
      }
    }
    
    // 初回チェックで既に遅延している場合
    if (statusState.lastStatus === null && currentStatus.status !== '平常運転') {
      shouldNotify = true;
      notificationTitle = '🚃 JR高崎線: 運行に支障があります';
      console.log('[Scheduler] 初回チェックで遅延を検出');
    }
    
    // 通知を送信
    let notificationSent = false;
    if (shouldNotify) {
      try {
        const subscriptions = await subscriptionStore.getAllSubscriptions();
        
        if (subscriptions.length > 0) {
          const notification = createStatusChangeNotification(currentStatus.status, isRecovered);
          notification.title = notificationTitle;
          
          const result = await sendPushNotificationToAll(subscriptions, notification);
          
          console.log(`[Scheduler] 通知送信完了: 成功=${result.succeeded}, 失敗=${result.failed}`);
          
          // 無効な購読を削除
          if (result.invalidSubscriptions.length > 0) {
            await subscriptionStore.removeInvalidSubscriptions(result.invalidSubscriptions);
          }
          
          notificationSent = true;
          statusState.lastNotificationTime = now;
        } else {
          console.log('[Scheduler] 通知対象の購読者が存在しません');
        }
      } catch (error) {
        console.error('[Scheduler] 通知送信エラー:', error);
      }
    }
    
    // 状態を更新
    statusState.lastStatus = currentStatus.status;
    statusState.lastCheckTime = now;
    statusState.isDelayed = currentStatus.status !== '平常運転';
    
    // 遅延時の30分間隔監視の管理
    if (statusState.isDelayed && !statusState.delayCheckInterval) {
      console.log('[Scheduler] 遅延監視を開始します（30分間隔）');
      statusState.delayCheckInterval = setInterval(() => {
        checkTrainStatusAndNotify().catch(error => {
          console.error('[Scheduler] 遅延監視中のエラー:', error);
        });
      }, DELAY_CHECK_INTERVAL);
    } else if (!statusState.isDelayed && statusState.delayCheckInterval) {
      console.log('[Scheduler] 遅延監視を終了します');
      clearInterval(statusState.delayCheckInterval);
      statusState.delayCheckInterval = null;
    }
    
    return {
      status: currentStatus.status,
      notificationSent
    };
  } catch (error) {
    console.error('[Scheduler] 運行状況チェックエラー:', error);
    return {
      status: 'エラー',
      notificationSent: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * 現在の状態を取得
 */
export function getSchedulerState(): StatusState {
  return { ...statusState };
}

/**
 * 状態をリセット（テスト用）
 */
export function resetSchedulerState(): void {
  if (statusState.delayCheckInterval) {
    clearInterval(statusState.delayCheckInterval);
  }
  
  statusState = {
    lastStatus: null,
    lastCheckTime: null,
    isDelayed: false,
    lastNotificationTime: null,
    delayCheckInterval: null
  };
}

/**
 * 平日かどうかを判定
 */
export function isWeekday(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // 月曜日(1)から金曜日(5)
}

/**
 * 定期チェック時刻かどうかを判定
 */
export function isScheduledTime(date: Date = new Date()): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // 7:00 または 17:00
  return (hours === 7 && minutes === 0) || (hours === 17 && minutes === 0);
}