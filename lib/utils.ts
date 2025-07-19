export function parseTrainStatus(statusText: string): {
  status: string;
  isNormal: boolean;
  details?: string;
} {
  // 状態テキストを正規化
  const normalizedText = statusText.trim();
  
  // 平常運転かどうかを判定
  const isNormal = normalizedText.includes('平常運転');
  
  // 詳細情報を抽出（遅延理由など）
  let details: string | undefined;
  if (!isNormal) {
    // 遅延情報のパターンマッチング
    const delayMatch = normalizedText.match(/遅延|運転見合わせ|運休/);
    if (delayMatch) {
      details = normalizedText;
    }
  }
  
  return {
    status: normalizedText,
    isNormal,
    details
  };
}

export function formatLastUpdated(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // 秒単位
  if (diff < 60000) {
    return '数秒前';
  }
  
  // 分単位
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分前`;
  }
  
  // 時間単位
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}時間前`;
  }
  
  // 日付表示
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
}

export function shouldNotify(
  previousStatus: string | null,
  currentStatus: string
): boolean {
  // 前回の状態がない場合は通知しない（初回起動時）
  if (!previousStatus) {
    return false;
  }
  
  const wasNormal = previousStatus.includes('平常運転');
  const isNormal = currentStatus.includes('平常運転');
  
  // 状態が変化した場合のみ通知
  return wasNormal !== isNormal;
}