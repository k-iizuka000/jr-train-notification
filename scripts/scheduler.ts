#!/usr/bin/env node

import cron from 'node-cron';
import { checkTrainStatusAndNotify, isWeekday } from '../lib/scheduler';

// 環境変数の設定
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

console.log('=================================');
console.log('JR高崎線 運行状況監視スケジューラー');
console.log('=================================');
console.log(`環境: ${process.env.NODE_ENV}`);
console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`);
console.log('');

// 開発環境用の設定
const isDevelopment = process.env.NODE_ENV !== 'production';

// 定期チェックのcron設定
// 本番: 平日の7:00と17:00
// 開発: 1分ごと（テスト用）
const schedulePattern = isDevelopment ? '* * * * *' : '0 7,17 * * 1-5';

console.log(`スケジュール: ${schedulePattern}`);
if (isDevelopment) {
  console.log('⚠️  開発モード: 1分ごとにチェックを実行します');
} else {
  console.log('✅ 本番モード: 平日の7:00と17:00にチェックを実行します');
}
console.log('');

// 手動実行用のチェック関数
async function manualCheck() {
  console.log('\n📍 手動チェックを実行...');
  const result = await checkTrainStatusAndNotify();
  console.log(`結果: ${JSON.stringify(result, null, 2)}`);
}

// スケジュールタスクの作成
const task = cron.schedule(schedulePattern, async () => {
  // 本番環境では平日のみ実行
  if (!isDevelopment && !isWeekday()) {
    console.log('[Skip] 週末のためチェックをスキップします');
    return;
  }
  
  console.log('\n⏰ スケジュールチェックを実行...');
  console.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}`);
  
  try {
    const result = await checkTrainStatusAndNotify();
    console.log(`✅ チェック完了: ${result.status}`);
    
    if (result.notificationSent) {
      console.log('📨 通知を送信しました');
    }
    
    if (result.error) {
      console.error('❌ エラー:', result.error);
    }
  } catch (error) {
    console.error('❌ スケジューラーエラー:', error);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Tokyo'
});

// 起動時に即座に1回実行（開発環境のみ）
if (isDevelopment) {
  console.log('🚀 開発モード: 起動時チェックを実行します...\n');
  manualCheck().catch(error => {
    console.error('起動時チェックエラー:', error);
  });
}

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n\n⏹️  スケジューラーを停止します...');
  task.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  スケジューラーを停止します...');
  task.stop();
  process.exit(0);
});

// キー入力の監視（開発環境のみ）
if (isDevelopment) {
  console.log('\n📌 コマンド:');
  console.log('  c - 手動チェックを実行');
  console.log('  q - 終了');
  console.log('');
  
  // 標準入力の設定
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', async (key) => {
    if (key === 'c') {
      await manualCheck();
    } else if (key === 'q' || key === '\u0003') { // Ctrl+C
      console.log('\n\n👋 終了します...');
      task.stop();
      process.exit(0);
    }
  });
}

console.log('✨ スケジューラーが起動しました\n');