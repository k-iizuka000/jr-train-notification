// APIエンドポイントのテストスクリプト

async function testApi() {
  const baseUrl = 'http://localhost:3010';
  
  console.log('Testing /api/jr/status endpoint...\n');
  
  try {
    // 通常のリクエスト
    console.log('1. Normal request:');
    const response1 = await fetch(`${baseUrl}/api/jr/status`);
    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', JSON.stringify(data1, null, 2));
    
    console.log('\n2. Request with nocache parameter:');
    const response2 = await fetch(`${baseUrl}/api/jr/status?nocache=true`);
    const data2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Response:', JSON.stringify(data2, null, 2));
    
    // ヘッダーの確認
    console.log('\n3. Response headers:');
    console.log('Cache-Control:', response1.headers.get('cache-control'));
    console.log('Content-Type:', response1.headers.get('content-type'));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nMake sure the development server is running on port 3010');
    console.log('Run: npm run dev');
  }
}

testApi();