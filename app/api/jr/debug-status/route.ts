import { createApiResponse, createApiError } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';

// Vercel Edge Runtime設定
export const runtime = 'nodejs';

export async function GET() {
  logger.info('GET /api/jr/debug-statusへのリクエスト', 'API');
  
  try {
    // 環境情報を収集
    const debugInfo = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        USE_MOCK_SCRAPER: process.env.USE_MOCK_SCRAPER,
        NODE_VERSION: process.version,
        PLATFORM: process.platform,
        ARCH: process.arch,
      },
      chromium: {
        sparticuzAvailable: false,
        executablePath: null as string | null,
        error: null as string | null,
      },
      puppeteer: {
        coreAvailable: false,
        regularAvailable: false,
      },
      memory: {
        rss: process.memoryUsage().rss / 1024 / 1024,
        heapTotal: process.memoryUsage().heapTotal / 1024 / 1024,
        heapUsed: process.memoryUsage().heapUsed / 1024 / 1024,
        external: process.memoryUsage().external / 1024 / 1024,
      }
    };

    // @sparticuz/chromiumの確認
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const chromium = require('@sparticuz/chromium').default || require('@sparticuz/chromium');
      debugInfo.chromium.sparticuzAvailable = true;
      debugInfo.chromium.executablePath = await chromium.executablePath();
    } catch (error) {
      debugInfo.chromium.error = error instanceof Error ? error.message : String(error);
    }

    // puppeteer-coreの確認
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('puppeteer-core');
      debugInfo.puppeteer.coreAvailable = true;
    } catch {
      // 無視
    }

    // puppeteerの確認
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('puppeteer');
      debugInfo.puppeteer.regularAvailable = true;
    } catch {
      // 無視
    }

    // 実際のスクレイピングテスト
    const scrapingTest = {
      success: false,
      error: null as string | null,
      details: null as unknown,
    };

    try {
      const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
      
      if (isVercel && debugInfo.chromium.sparticuzAvailable) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const chromium = require('@sparticuz/chromium');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const puppeteer = require('puppeteer-core');
        
        const browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: true,
        });
        
        const page = await browser.newPage();
        await page.goto('https://example.com', { waitUntil: 'networkidle2' });
        const title = await page.title();
        await browser.close();
        
        scrapingTest.success = true;
        scrapingTest.details = { title };
      } else {
        scrapingTest.error = 'Not in Vercel environment or chromium not available';
      }
    } catch (error) {
      scrapingTest.error = error instanceof Error ? error.message : String(error);
      if (error instanceof Error && error.stack) {
        scrapingTest.details = {
          stack: error.stack.split('\n').slice(0, 10),
          name: error.name,
        };
      }
    }

    const response = {
      timestamp: new Date().toISOString(),
      debugInfo,
      scrapingTest,
    };

    return createApiResponse(response, 200);

  } catch (error) {
    logger.error(
      'GET /api/jr/debug-statusでエラー発生',
      'API',
      error instanceof Error ? error : new Error(String(error))
    );

    return createApiError(
      'DEBUG_ERROR',
      'デバッグ情報の取得に失敗しました',
      500,
      undefined,
      error
    );
  }
}