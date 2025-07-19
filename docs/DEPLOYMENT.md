# デプロイメントガイド

## 事前準備

### 1. VAPID鍵の生成

プッシュ通知機能に必要なVAPID鍵を生成します：

```bash
npm run generate-vapid-keys
```

このコマンドは以下を出力します：
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: 公開鍵（クライアント側で使用）
- `VAPID_PRIVATE_KEY`: 秘密鍵（サーバー側で使用）

### 2. 環境変数の準備

以下の環境変数を準備してください：

```env
# 必須
NEXT_PUBLIC_VAPID_PUBLIC_KEY=生成された公開鍵
VAPID_PRIVATE_KEY=生成された秘密鍵
VAPID_SUBJECT=mailto:your-email@example.com

# オプション
PUSH_NOTIFICATION_DEBUG=false
SCRAPING_TIMEOUT=10000
LOG_LEVEL=info
```

## Vercelへのデプロイ

### 方法1: Vercel CLIを使用

```bash
# Vercel CLIのインストール
npm i -g vercel

# プロジェクトディレクトリで実行
vercel

# 環境変数の設定
vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY
vercel env add VAPID_PRIVATE_KEY
vercel env add VAPID_SUBJECT

# 本番環境へデプロイ
vercel --prod
```

### 方法2: GitHub連携

1. GitHubにリポジトリをプッシュ
2. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
3. 「New Project」をクリック
4. GitHubリポジトリをインポート
5. 環境変数を設定画面で入力
6. 「Deploy」をクリック

### Vercel固有の設定

`vercel.json`ファイルには以下の設定が含まれています：

```json
{
  "crons": [
    {
      "path": "/api/jr/check",
      "schedule": "0 7 * * 1-5",
      "env": "production"
    },
    {
      "path": "/api/jr/check",
      "schedule": "0 17 * * 1-5",
      "env": "production"
    }
  ]
}
```

これにより、平日の朝7時と夕方17時に自動的に運行状況をチェックします。

## その他のプラットフォーム

### Netlify

1. `netlify.toml`を作成：

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NEXT_PUBLIC_VAPID_PUBLIC_KEY = "your-public-key"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

2. Netlify CLIまたはWebUIでデプロイ

### 自前のサーバー

1. Node.js環境を準備（v18以上推奨）
2. アプリケーションをビルド：

```bash
npm run build
```

3. 環境変数を設定してサーバーを起動：

```bash
NODE_ENV=production npm start
```

4. PM2やsystemdなどでプロセスを管理
5. nginxなどでリバースプロキシを設定

### Docker

`Dockerfile`を作成：

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

## 本番環境での確認事項

### 1. プッシュ通知の設定

- VAPID鍵が正しく設定されているか確認
- `VAPID_SUBJECT`に有効なメールアドレスが設定されているか確認

### 2. スケジューラーの動作確認

- Vercelの場合: Vercel Dashboardの「Functions」タブでcron実行履歴を確認
- 自前サーバーの場合: node-cronが正しく動作しているか確認

### 3. スクレイピングの動作確認

- JR東日本のサイトにアクセス可能か確認
- Puppeteerが正しくインストールされているか確認

### 4. PWA機能の確認

- HTTPS環境でアクセスできるか確認
- Service Workerが正しく登録されるか確認
- manifest.jsonが正しく配信されるか確認

## トラブルシューティング

### プッシュ通知が送信されない

1. VAPID鍵が正しく設定されているか確認
2. ブラウザの通知権限が許可されているか確認
3. `/api/jr/subscribe`エンドポイントが正常に動作しているか確認

### スクレイピングがエラーになる

1. Puppeteerの依存関係が正しくインストールされているか確認
2. メモリ不足の場合は、サーバーのリソースを増やす
3. JR東日本のサイト構造が変更されていないか確認

### Vercelでcronが実行されない

1. プランがProプラン以上であることを確認（Hobbyプランではcron機能が制限される）
2. vercel.jsonの設定が正しいか確認
3. タイムゾーンの設定を確認（VercelはUTCを使用）