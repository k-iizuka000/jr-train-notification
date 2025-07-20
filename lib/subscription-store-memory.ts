import type { PushSubscriptionData } from '@/types';

/**
 * メモリベースの購読ストレージ
 * Vercelのサーバーレス環境では、リクエスト間でメモリが共有されないため、
 * 本番環境では外部データベースの使用を推奨
 */
export class SubscriptionMemoryStore {
  private static instance: SubscriptionMemoryStore;
  private subscriptions: Map<string, PushSubscriptionData> = new Map();
  private instanceId: string;
  private createdAt: Date;

  private constructor() {
    this.instanceId = Math.random().toString(36).substring(7);
    this.createdAt = new Date();
    console.log(`=== メモリストアインスタンス作成 ===`);
    console.log(`インスタンスID: ${this.instanceId}`);
    console.log(`作成日時: ${this.createdAt.toISOString()}`);
  }

  static getInstance(): SubscriptionMemoryStore {
    if (!SubscriptionMemoryStore.instance) {
      SubscriptionMemoryStore.instance = new SubscriptionMemoryStore();
    }
    return SubscriptionMemoryStore.instance;
  }

  /**
   * ストレージを初期化する（メモリストアでは何もしない）
   */
  async initialize(): Promise<void> {
    console.log(`メモリストアを使用中（初期化不要）`);
    console.log(`インスタンスID: ${this.instanceId}`);
    console.log(`インスタンス作成から: ${Date.now() - this.createdAt.getTime()}ms経過`);
  }

  /**
   * 購読を追加する
   */
  async addSubscription(subscription: PushSubscriptionData): Promise<void> {
    console.log('=== メモリストアに購読情報を追加 ===');
    console.log(`インスタンスID: ${this.instanceId}`);
    console.log('エンドポイント:', subscription.endpoint);
    console.log('現在の購読数（追加前）:', this.subscriptions.size);
    
    this.subscriptions.set(subscription.endpoint, subscription);
    
    console.log('現在の購読数（追加後）:', this.subscriptions.size);
    console.log('メモリ内の全エンドポイント:');
    Array.from(this.subscriptions.keys()).forEach((ep, index) => {
      console.log(`  ${index + 1}. ${ep.substring(0, 50)}...`);
    });
    
    // Vercelの制限を警告
    console.warn('⚠️ 注意: Vercelのサーバーレス環境では、このメモリストアはリクエスト間で共有されません。');
    console.warn('⚠️ 本番環境では、Vercel KVやRedisなどの永続的なストレージの使用を推奨します。');
  }

  /**
   * 購読を削除する
   */
  async removeSubscription(endpoint: string): Promise<boolean> {
    console.log('=== メモリストアから購読情報を削除 ===');
    console.log('削除エンドポイント:', endpoint);
    
    const deleted = this.subscriptions.delete(endpoint);
    console.log('削除結果:', deleted ? '成功' : '失敗（存在しない）');
    
    return deleted;
  }

  /**
   * 購読を取得する
   */
  async getSubscription(endpoint: string): Promise<PushSubscriptionData | null> {
    console.log('=== メモリストアから購読情報を検索 ===');
    console.log(`インスタンスID: ${this.instanceId}`);
    console.log('検索エンドポイント:', endpoint);
    console.log('現在の購読数:', this.subscriptions.size);
    
    const found = this.subscriptions.get(endpoint);
    console.log('検索結果:', found ? '見つかりました' : '見つかりませんでした');
    
    if (!found) {
      if (this.subscriptions.size === 0) {
        console.error('❌ エラー: メモリストアが空です。');
        console.error('原因: Vercelのサーバーレス環境では、異なるリクエストは異なるインスタンスで処理される可能性があります。');
        console.error('解決策: Vercel KV、Redis、またはデータベースを使用してください。');
      } else {
        console.log('メモリ内のエンドポイント一覧:');
        Array.from(this.subscriptions.keys()).forEach((ep, index) => {
          console.log(`  ${index + 1}. ${ep.substring(0, 50)}...`);
          if (ep === endpoint) {
            console.log('    → 完全一致！（なぜ見つからない？）');
          }
        });
      }
    }
    
    return found || null;
  }

  /**
   * すべての購読を取得する
   */
  async getAllSubscriptions(): Promise<PushSubscriptionData[]> {
    console.log('=== メモリストアから全購読情報を取得 ===');
    console.log('購読数:', this.subscriptions.size);
    return Array.from(this.subscriptions.values());
  }

  /**
   * 購読数を取得する
   */
  async getCount(): Promise<number> {
    return this.subscriptions.size;
  }

  /**
   * 無効な購読を削除する
   */
  async removeInvalidSubscriptions(endpoints: string[]): Promise<void> {
    console.log('=== メモリストアから無効な購読を削除 ===');
    console.log('削除対象数:', endpoints.length);
    
    let removed = 0;
    for (const endpoint of endpoints) {
      if (this.subscriptions.delete(endpoint)) {
        removed++;
      }
    }
    
    console.log(`${removed}件の無効な購読を削除しました`);
  }

  /**
   * ストレージをクリアする
   */
  async clear(): Promise<void> {
    console.log('=== メモリストアをクリア ===');
    console.log('クリア前の購読数:', this.subscriptions.size);
    this.subscriptions.clear();
    console.log('クリア完了');
  }
}

// シングルトンインスタンスをエクスポート
export const subscriptionMemoryStore = SubscriptionMemoryStore.getInstance();