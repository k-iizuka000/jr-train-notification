// Vercel環境でPuppeteerが動作するかテスト
process.env.VERCEL = '1';
process.env.VERCEL_ENV = 'production';

const runPuppeteerTest = async () => {
  console.log('=== Puppeteer Vercel環境テスト ===\n');

  try {
    const chromium = require('@sparticuz/chromium').default || require('@sparticuz/chromium');
    const puppeteer = require('puppeteer-core');
    
    console.log('Chromium実行パスを取得中...');
    const executablePath = await chromium.executablePath();
    console.log('✅ 実行パス:', executablePath);
    
    const fs = require('fs');
    console.log('✅ ファイル存在確認:', fs.existsSync(executablePath));
    
    console.log('\nブラウザを起動中...');
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: true,
    });
    
    console.log('✅ ブラウザが起動しました');
    
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const title = await page.title();
    console.log('✅ ページタイトル:', title);
    
    await browser.close();
    console.log('✅ ブラウザを閉じました');
    
    console.log('\n✅ Puppeteerテストが成功しました！');
  } catch (error) {
    console.log('\n❌ エラーが発生しました:');
    console.log('エラー名:', error.name);
    console.log('メッセージ:', error.message);
    if (error.stack) {
      console.log('\nスタックトレース:');
      console.log(error.stack);
    }
  }
};

runPuppeteerTest();