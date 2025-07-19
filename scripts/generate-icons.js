const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// アイコンサイズの配列
const sizes = [192, 512];

// アイコンを生成する関数
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 背景色
  ctx.fillStyle = '#0070f3';
  ctx.fillRect(0, 0, size, size);

  // テキスト設定
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // JRのテキストを描画
  ctx.fillText('JR', size / 2, size / 2);

  // ファイルを保存
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(__dirname, `../public/icons/icon-${size}x${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated: icon-${size}x${size}.png`);
}

// バッジアイコンを生成
function generateBadge() {
  const size = 72;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 背景色
  ctx.fillStyle = '#0070f3';
  ctx.fillRect(0, 0, size, size);

  // テキスト設定
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // JRのテキストを描画
  ctx.fillText('JR', size / 2, size / 2);

  // ファイルを保存
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(__dirname, '../public/icons/badge-72x72.png');
  fs.writeFileSync(filePath, buffer);
  console.log('Generated: badge-72x72.png');
}

// アイコンを生成
sizes.forEach(generateIcon);
generateBadge();