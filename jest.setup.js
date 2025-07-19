// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock環境変数
process.env = {
  ...process.env,
  SCRAPING_TIMEOUT: '30000',
  SCRAPING_MAX_RETRIES: '3',
  CACHE_DURATION: '60000',
  PUPPETEER_HEADLESS: 'true',
  INTERNAL_API_TOKEN: 'test-token',
}

// Next.jsのサーバーサイドAPIのモック
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(url, init) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
    
    static json(body, init) {
      const response = new Response(JSON.stringify(body), init);
      response.headers.set('content-type', 'application/json');
      return response;
    }
    
    async json() {
      return JSON.parse(this.body);
    }
  };
}

// NextResponseのモック
jest.mock('next/server', () => {
  class MockResponse {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.headers = new Headers(init?.headers || {});
    }
    
    async json() {
      return JSON.parse(this.body);
    }
  }
  
  return {
    NextResponse: {
      json: (body, init) => {
        const response = new MockResponse(JSON.stringify(body), init);
        response.headers.set('content-type', 'application/json');
        return response;
      }
    },
    NextRequest: class NextRequest {
      constructor(url, init) {
        this.url = url;
        this.method = init?.method || 'GET';
        this.headers = new Headers(init?.headers || {});
        this._body = init?.body || null;
        this.nextUrl = {
          searchParams: new URLSearchParams(new URL(url).search),
          pathname: new URL(url).pathname,
        };
      }
      
      async json() {
        if (typeof this._body === 'string') {
          return JSON.parse(this._body);
        }
        return this._body;
      }
      
      get(headerName) {
        return this.headers.get(headerName);
      }
    }
  };
});