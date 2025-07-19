const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// アイコンのサイズ定義
const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];

// 出力ディレクトリ
const outputDir = path.join(__dirname, '../public/icons');

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 基本のアイコンを生成する関数
async function generateIcon(size, isMaskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 背景色
  if (isMaskable) {
    // Maskableアイコンは背景が必要
    ctx.fillStyle = '#0070f3';
    ctx.fillRect(0, 0, size, size);
  }
  
  // 電車のシンプルなアイコンを描画
  const padding = isMaskable ? size * 0.2 : size * 0.1; // Maskableは余白を多めに
  const trainSize = size - (padding * 2);
  const trainX = padding;
  const trainY = padding;
  
  // 電車本体（白色）
  ctx.fillStyle = isMaskable ? '#ffffff' : '#0070f3';
  ctx.fillRect(trainX, trainY + trainSize * 0.3, trainSize, trainSize * 0.4);
  
  // 窓
  if (!isMaskable) {
    ctx.fillStyle = '#ffffff';
  } else {
    ctx.fillStyle = '#0070f3';
  }
  const windowWidth = trainSize * 0.15;
  const windowHeight = trainSize * 0.15;
  const windowY = trainY + trainSize * 0.4;
  for (let i = 0; i < 4; i++) {
    const windowX = trainX + trainSize * 0.1 + (i * trainSize * 0.22);
    ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
  }
  
  // 線路
  ctx.strokeStyle = isMaskable ? '#ffffff' : '#0070f3';
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.moveTo(trainX - padding * 0.5, trainY + trainSize * 0.7);
  ctx.lineTo(trainX + trainSize + padding * 0.5, trainY + trainSize * 0.7);
  ctx.stroke();
  
  // JRロゴ風のテキスト
  ctx.font = `bold ${size * 0.15}px Arial`;
  ctx.fillStyle = isMaskable ? '#ffffff' : '#0070f3';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('JR', size / 2, trainY + trainSize * 0.15);
  
  return canvas;
}

// アイコンを保存する関数
async function saveIcon(canvas, filename) {
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outputDir, filename), buffer);
  console.log(`生成完了: ${filename}`);
}

// すべてのアイコンを生成
async function generateAllIcons() {
  console.log('PWAアイコンの生成を開始します...\n');
  
  // 通常のアイコン
  for (const size of sizes) {
    const canvas = await generateIcon(size);
    await saveIcon(canvas, `icon-${size}x${size}.png`);
  }
  
  // Maskableアイコン（主要サイズのみ）
  const maskableSizes = [192, 512];
  for (const size of maskableSizes) {
    const canvas = await generateIcon(size, true);
    await saveIcon(canvas, `icon-maskable-${size}x${size}.png`);
  }
  
  // バッジアイコン（通知用）- 既に存在する場合はスキップ
  if (!fs.existsSync(path.join(outputDir, 'badge-72x72.png'))) {
    const badgeCanvas = createCanvas(72, 72);
    const badgeCtx = badgeCanvas.getContext('2d');
    
    // シンプルな円形バッジ
    badgeCtx.fillStyle = '#ef4444'; // 赤色
    badgeCtx.beginPath();
    badgeCtx.arc(36, 36, 30, 0, Math.PI * 2);
    badgeCtx.fill();
    
    // !マーク
    badgeCtx.fillStyle = '#ffffff';
    badgeCtx.font = 'bold 40px Arial';
    badgeCtx.textAlign = 'center';
    badgeCtx.textBaseline = 'middle';
    badgeCtx.fillText('!', 36, 36);
    
    await saveIcon(badgeCanvas, 'badge-72x72.png');
  }
  
  // Apple Touch Icon
  const appleTouchCanvas = await generateIcon(180);
  await saveIcon(appleTouchCanvas, 'apple-touch-icon.png');
  
  // ショートカットアイコン
  const shortcutCanvas = createCanvas(96, 96);
  const shortcutCtx = shortcutCanvas.getContext('2d');
  
  // 背景
  shortcutCtx.fillStyle = '#10b981'; // 緑色
  shortcutCtx.fillRect(0, 0, 96, 96);
  
  // チェックマーク
  shortcutCtx.strokeStyle = '#ffffff';
  shortcutCtx.lineWidth = 8;
  shortcutCtx.lineCap = 'round';
  shortcutCtx.lineJoin = 'round';
  shortcutCtx.beginPath();
  shortcutCtx.moveTo(25, 48);
  shortcutCtx.lineTo(40, 63);
  shortcutCtx.lineTo(71, 32);
  shortcutCtx.stroke();
  
  await saveIcon(shortcutCanvas, 'shortcut-status.png');
  
  console.log('\n✨ すべてのアイコンの生成が完了しました！');
}

// 実行
generateAllIcons().catch(console.error);