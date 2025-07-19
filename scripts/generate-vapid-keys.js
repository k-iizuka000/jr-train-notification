const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// VAPID鍵を生成
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID鍵を生成しました。\n');
console.log('以下の内容を .env.local ファイルに追加してください：\n');
console.log('# VAPID設定（プッシュ通知用）');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
console.log('\n注意: VAPID_SUBJECTには実際の連絡先メールアドレスを設定してください。');

// .env.local.example を更新
const envExamplePath = path.join(__dirname, '../.env.local.example');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

if (!envExampleContent.includes('VAPID')) {
  const vapidSection = `
# VAPID設定（プッシュ通知用）
# 以下のコマンドで生成: npm run generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_SUBJECT=mailto:your-email@example.com`;

  fs.writeFileSync(envExamplePath, envExampleContent + vapidSection);
  console.log('\n.env.local.example ファイルを更新しました。');
}