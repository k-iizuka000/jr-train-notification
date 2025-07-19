# JR高崎線運行情報通知サービス

JR東日本高崎線の運行情報を監視し、遅延や運休が発生した際にプッシュ通知でお知らせするPWA（Progressive Web App）です。

## 機能

- 🚂 JR東日本公式サイトから高崎線の運行情報を取得
- 📱 PWA対応（ホーム画面に追加可能）
- 🔔 プッシュ通知による遅延・運休のお知らせ
- ⏰ 平日朝（7:00）と夕方（17:00）の定期監視
- 🔄 遅延発生時の30分間隔での復旧監視
- 📊 リアルタイムな運行状況表示

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
# VAPID鍵の生成
npm run generate-vapid-keys

# .env.localファイルを作成し、生成された鍵を設定
cp .env.example .env.local
```

`.env.local`ファイルに以下の環境変数を設定：

```env
# VAPID設定（必須）
NEXT_PUBLIC_VAPID_PUBLIC_KEY=生成された公開鍵
VAPID_PRIVATE_KEY=生成された秘密鍵
VAPID_SUBJECT=mailto:your-email@example.com

# その他の設定（オプション）
PUSH_NOTIFICATION_DEBUG=false
SCRAPING_TIMEOUT=10000
LOG_LEVEL=info
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3010](http://localhost:3010) でアプリケーションにアクセスできます。

## デプロイ

### Vercelでのデプロイ

1. [Vercel](https://vercel.com)にプロジェクトをインポート

2. 環境変数を設定：
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`

3. デプロイ後、`vercel.json`のcron設定により定期監視が自動的に有効になります

### 必要な環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | VAPID公開鍵（プッシュ通知用） | ✅ |
| VAPID_PRIVATE_KEY | VAPID秘密鍵（プッシュ通知用） | ✅ |
| VAPID_SUBJECT | VAPID連絡先（mailto:形式） | ✅ |
| PUSH_NOTIFICATION_DEBUG | 通知デバッグモード | ❌ |
| SCRAPING_TIMEOUT | スクレイピングタイムアウト時間 | ❌ |
| LOG_LEVEL | ログレベル（debug/info/warn/error） | ❌ |

## 開発

### テストの実行

```bash
# 単体テスト
npm run test

# E2Eテスト
npm run test:e2e

# すべてのテスト
npm run test:all
```

### ビルド

```bash
npm run build
```

### その他のスクリプト

```bash
# アイコン生成
npm run generate-icons

# PWAアイコン生成
npm run generate-pwa-icons

# VAPID鍵生成
npm run generate-vapid-keys

# APIテスト
npm run test-api
```

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **PWA**: Service Worker + Web Push API
- **スクレイピング**: Puppeteer
- **テスト**: Jest + Playwright
- **デプロイ**: Vercel

## ライセンス

[MIT License](LICENSE)
