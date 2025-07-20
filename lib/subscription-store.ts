import type { PushSubscriptionData } from '@/types';
import fs from 'fs/promises';
import path from 'path';

// ストレージタイプを環境変数で制御（Vercelではメモリストレージを使用）
const USE_FILE_STORAGE = process.env.SUBSCRIPTION_STORAGE !== 'memory';

// 開発環境では一時ディレクトリ、本番環境ではVercelの/tmpを使用
const STORAGE_PATH = process.env.NODE_ENV === 'production' 
  ? '/tmp/subscriptions.json'  // Vercelでは/tmpディレクトリを使用
  : path.join(process.cwd(), '.temp', 'subscriptions.json');

// ストレージディレクトリを確保
async function ensureStorageDir() {
  const dir = path.dirname(STORAGE_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error('ストレージディレクトリの作成に失敗:', error);
  }
}

export class SubscriptionStore {
  private static instance: SubscriptionStore;
  private subscriptions: Map<string, PushSubscriptionData> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): SubscriptionStore {
    if (!SubscriptionStore.instance) {
      SubscriptionStore.instance = new SubscriptionStore();
    }
    return SubscriptionStore.instance;
  }

  /**
   * ストレージを初期化する
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await ensureStorageDir();
      const data = await fs.readFile(STORAGE_PATH, 'utf-8');
      const subscriptions = JSON.parse(data) as PushSubscriptionData[];
      
      subscriptions.forEach(sub => {
        this.subscriptions.set(sub.endpoint, sub);
      });
      
      this.initialized = true;
      console.log(`${subscriptions.length}件の購読を読み込みました`);
    } catch (error) {
      // ファイルが存在しない場合は空で初期化
      this.initialized = true;
      console.log('新規ストレージを初期化しました');
    }
  }

  /**
   * 購読を追加する
   */
  async addSubscription(subscription: PushSubscriptionData): Promise<void> {
    await this.initialize();
    
    console.log('=== 購読情報を追加 ===');
    console.log('エンドポイント:', subscription.endpoint);
    console.log('エンドポイント長:', subscription.endpoint.length);
    console.log('現在の購読数（追加前）:', this.subscriptions.size);
    
    this.subscriptions.set(subscription.endpoint, subscription);
    await this.save();
    
    console.log('現在の購読数（追加後）:', this.subscriptions.size);
    console.log('保存された全エンドポイント:');
    Array.from(this.subscriptions.keys()).forEach((ep, index) => {
      console.log(`  ${index + 1}. ${ep.substring(0, 50)}...`);
    });
  }

  /**
   * 購読を削除する
   */
  async removeSubscription(endpoint: string): Promise<boolean> {
    await this.initialize();
    
    const deleted = this.subscriptions.delete(endpoint);
    if (deleted) {
      await this.save();
      console.log(`購読を削除しました: ${endpoint}`);
    }
    
    return deleted;
  }

  /**
   * 購読を取得する
   */
  async getSubscription(endpoint: string): Promise<PushSubscriptionData | null> {
    await this.initialize();
    
    console.log('=== 購読情報を検索 ===');
    console.log('検索エンドポイント:', endpoint);
    console.log('検索エンドポイント長:', endpoint.length);
    console.log('現在の購読数:', this.subscriptions.size);
    
    const found = this.subscriptions.get(endpoint);
    console.log('検索結果:', found ? '見つかりました' : '見つかりませんでした');
    
    if (!found && this.subscriptions.size > 0) {
      console.log('保存されているエンドポイント一覧:');
      Array.from(this.subscriptions.keys()).forEach((ep, index) => {
        console.log(`  ${index + 1}. ${ep.substring(0, 50)}...`);
        if (ep === endpoint) {
          console.log('    → 完全一致！（なぜ見つからない？）');
        } else if (ep.includes(endpoint.substring(0, 30))) {
          console.log('    → 部分一致');
        }
      });
    }
    
    return found || null;
  }

  /**
   * すべての購読を取得する
   */
  async getAllSubscriptions(): Promise<PushSubscriptionData[]> {
    await this.initialize();
    return Array.from(this.subscriptions.values());
  }

  /**
   * 購読数を取得する
   */
  async getCount(): Promise<number> {
    await this.initialize();
    return this.subscriptions.size;
  }

  /**
   * 無効な購読を削除する
   */
  async removeInvalidSubscriptions(endpoints: string[]): Promise<void> {
    await this.initialize();
    
    let removed = 0;
    for (const endpoint of endpoints) {
      if (this.subscriptions.delete(endpoint)) {
        removed++;
      }
    }
    
    if (removed > 0) {
      await this.save();
      console.log(`${removed}件の無効な購読を削除しました`);
    }
  }

  /**
   * ストレージに保存する
   */
  private async save(): Promise<void> {
    try {
      await ensureStorageDir();
      const data = Array.from(this.subscriptions.values());
      await fs.writeFile(STORAGE_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('購読の保存に失敗しました:', error);
      throw new Error('購読の保存に失敗しました');
    }
  }

  /**
   * ストレージをクリアする（テスト用）
   */
  async clear(): Promise<void> {
    this.subscriptions.clear();
    await this.save();
    console.log('すべての購読をクリアしました');
  }
}

// シングルトンインスタンスをエクスポート
export const subscriptionStore = SubscriptionStore.getInstance();