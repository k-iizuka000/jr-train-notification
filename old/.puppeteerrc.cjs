const { join } = require('path');

/**
 * @type {import('puppeteer').PuppeteerConfiguration}
 */
module.exports = {
  // Chromiumのキャッシュディレクトリを変更
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};