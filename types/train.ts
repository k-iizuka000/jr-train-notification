export interface TrainStatus {
  status: string;           // 運行状況テキスト
  lastUpdated: Date;        // 最終更新時刻
  isNormal: boolean;        // 平常運転フラグ
  lastNotified?: Date;      // 最終通知送信時刻
}

export interface TrainStatusResponse {
  status: string;           // 運行状況（"平常運転" | その他）
  lastUpdated: string;      // 最終更新時刻（ISO形式）
  isNormal: boolean;        // 平常運転かどうか
}