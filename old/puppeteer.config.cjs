const { join } = require('path');

/**
 * Puppeteer configuration for Vercel deployment
 * @see https://pptr.dev/guides/configuration
 */
module.exports = {
  // Chromiumのキャッシュディレクトリを指定
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  
  // ダウンロード設定
  downloadBaseUrl: 'https://storage.googleapis.com/chrome-for-testing-public',
  
  // Vercel環境用の設定
  skipDownload: false,
  
  // 実行可能ファイルのパスを環境変数から取得可能にする
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
};