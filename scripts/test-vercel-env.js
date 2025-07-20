// Vercel環境をシミュレートしてデバッグ情報を取得
process.env.VERCEL = '1';
process.env.VERCEL_ENV = 'production';
process.env.NODE_ENV = 'production';

const runDebugTest = async () => {
  console.log('=== Vercel環境シミュレーション開始 ===\n');
  
  // 環境情報
  console.log('環境変数:');
  console.log('VERCEL:', process.env.VERCEL);
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('');

  // @sparticuz/chromiumのテスト
  console.log('=== @sparticuz/chromium テスト ===');
  try {
    const chromium = require('@sparticuz/chromium');
    console.log('✅ @sparticuz/chromiumが見つかりました');
    
    try {
      const executablePath = await chromium.executablePath();
      console.log('✅ 実行パス:', executablePath);
      
      // ファイルの存在確認
      const fs = require('fs');
      if (fs.existsSync(executablePath)) {
        console.log('✅ 実行ファイルが存在します');
      } else {
        console.log('❌ 実行ファイルが存在しません');
      }
    } catch (error) {
      console.log('❌ 実行パス取得エラー:', error.message);
    }

    console.log('Chromium args:', chromium.args);
    console.log('Chromium defaultViewport:', chromium.defaultViewport);
  } catch (error) {
    console.log('❌ @sparticuz/chromiumの読み込みエラー:', error.message);
  }

  console.log('\n=== puppeteer-core テスト ===');
  try {
    const puppeteerCore = require('puppeteer-core');
    console.log('✅ puppeteer-coreが見つかりました');
  } catch (error) {
    console.log('❌ puppeteer-coreの読み込みエラー:', error.message);
  }

  // 実際のスクレイピングテスト
  console.log('\n=== スクレイピングテスト ===');
  try {
    const { scrapeTrainStatus } = require('../lib/scraper');
    console.log('スクレイピングを実行中...');
    const result = await scrapeTrainStatus();
    console.log('✅ スクレイピング成功:', result);
  } catch (error) {
    console.log('❌ スクレイピングエラー:');
    console.log('  エラー名:', error.name);
    console.log('  メッセージ:', error.message);
    if (error.stack) {
      console.log('  スタック:');
      console.log(error.stack.split('\n').slice(0, 10).join('\n'));
    }
  }

  console.log('\n=== テスト完了 ===');
};

runDebugTest().catch(console.error);