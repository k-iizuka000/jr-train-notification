# Vercel デプロイメント デバッグガイド

## 現在の問題
- `/api/jr/status` エンドポイントが500エラーを返す
- エラーメッセージ: "Unexpected end of JSON input"

## 実施した修正

### 1. @sparticuz/chromium の導入
- `chrome-aws-lambda`の後継である`@sparticuz/chromium`を使用
- Vercel環境を自動検出して適切なライブラリを選択

### 2. Puppeteer起動オプションの最適化
```javascript
// Vercel環境用の追加引数
args: [
  ...chromium.args,
  '--disable-web-security',
  '--disable-features=IsolateOrigins,site-per-process',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-blink-features=AutomationControlled'
]
```

### 3. メモリ設定の追加
- 各関数に1024MBのメモリを割り当て
- Puppeteerの実行に必要なリソースを確保

### 4. エラーハンドリングの強化
- 詳細なエラーログを追加
- Chromium実行パスの取得エラーを明示的に処理

## デバッグ手順

### 1. Vercelログの確認
```bash
# Vercel CLIでログを確認
vercel logs <deployment-url>

# または、Vercelダッシュボードから確認
```

### 2. 環境変数の確認
以下の環境変数がVercelに設定されているか確認：
- `USE_MOCK_SCRAPER`: 開発中はtrueに設定してモックを使用
- `NODE_ENV`: productionに設定されているか確認

### 3. 代替案

#### オプション1: モックモードの使用
```bash
# Vercel環境変数に追加
USE_MOCK_SCRAPER=true
```

#### オプション2: 外部スクレイピングサービス
- Browserless.io
- ScrapingBee
- Puppeteer as a Service

#### オプション3: Edge Functionへの移行
```javascript
// app/api/jr/status/route.ts
export const runtime = 'edge'; // 現在は'nodejs'
```

## トラブルシューティング

### よくあるエラーと対処法

1. **"Could not find Chrome"エラー**
   - 原因: Chromiumバイナリが見つからない
   - 対処: @sparticuz/chromiumが正しくインストールされているか確認

2. **"Failed to launch the browser process"エラー**
   - 原因: メモリ不足または権限不足
   - 対処: メモリ設定を増やす、または引数を調整

3. **タイムアウトエラー**
   - 原因: 30秒の制限を超過
   - 対処: スクレイピング処理を最適化

## 推奨される次のステップ

1. **まずモックモードで動作確認**
   ```
   USE_MOCK_SCRAPER=true をVercel環境変数に設定
   ```

2. **本番環境での段階的な移行**
   - 最初はモックモードで運用
   - 安定したら実際のスクレイピングに切り替え

3. **長期的な解決策**
   - 外部APIサービスの導入を検討
   - JR東日本のAPIが提供されれば移行