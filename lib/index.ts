export * from './utils';

// 環境に応じて適切なスクレイパーをエクスポート
if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_SCRAPER === 'true') {
  module.exports.getTrainStatus = require('./scraper.mock').getTrainStatusMock;
  module.exports.scrapeTrainStatus = require('./scraper.mock').scrapeTrainStatusMock;
} else {
  module.exports.getTrainStatus = require('./scraper').getTrainStatus;
  module.exports.scrapeTrainStatus = require('./scraper').scrapeTrainStatus;
  module.exports.ScraperError = require('./scraper').ScraperError;
}