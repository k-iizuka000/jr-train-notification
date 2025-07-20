import type { PushSubscriptionData } from '@/types';

/**
 * メモリベースの購読ストレージ
 * Vercelのサーバーレス環境では、リクエスト間でメモリが共有されないため、
 * 本番環境では外部データベースの使用を推奨
 */
export class SubscriptionMemoryStore {
  private static instance: SubscriptionMemoryStore;
  private subscriptions: Map<string, PushSubscriptionData> = new Map();

  private constructor() {}

  static getInstance(): SubscriptionMemoryStore {
    if (!SubscriptionMemoryStore.instance) {
      SubscriptionMemoryStore.instance = new SubscriptionMemoryStore();
    }
    return SubscriptionMemoryStore.instance;
  }

  /**
   * 購読を追加する
   */
  async addSubscription(subscription: PushSubscriptionData): Promise<void> {
    console.log('=== メモリストアに購読情報を追加 ===');
    console.log('エンドポイント:', subscription.endpoint);
    console.log('現在の購読数（追加前）:', this.subscriptions.size);
    
    this.subscriptions.set(subscription.endpoint, subscription);
    
    console.log('現在の購読数（追加後）:', this.subscriptions.size);
    console.log('メモリ内の全エンドポイント:');
    Array.from(this.subscriptions.keys()).forEach((ep, index) => {
      console.log(`  ${index + 1}. ${ep.substring(0, 50)}...`);
    });
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
    console.log('検索エンドポイント:', endpoint);
    console.log('現在の購読数:', this.subscriptions.size);
    
    const found = this.subscriptions.get(endpoint);
    console.log('検索結果:', found ? '見つかりました' : '見つかりませんでした');
    
    if (!found && this.subscriptions.size > 0) {
      console.log('メモリ内のエンドポイント一覧:');
      Array.from(this.subscriptions.keys()).forEach((ep, index) => {
        console.log(`  ${index + 1}. ${ep.substring(0, 50)}...`);
        if (ep === endpoint) {
          console.log('    → 完全一致！（なぜ見つからない？）');
        }
      });
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