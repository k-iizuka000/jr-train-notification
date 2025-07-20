import { subscriptionStore as fileStore } from './subscription-store';
import { subscriptionMemoryStore as memoryStore } from './subscription-store-memory';

// Vercel環境ではメモリストレージを使用
const isVercel = process.env.VERCEL === '1';

console.log('=== 購読ストレージの初期化 ===');
console.log('環境:', process.env.NODE_ENV);
console.log('Vercel環境:', isVercel);
console.log('使用するストレージ:', isVercel ? 'メモリ' : 'ファイル');

// Vercel環境ではメモリストレージ、それ以外はファイルストレージを使用
export const subscriptionStore = isVercel ? memoryStore : fileStore;