const fs = require('fs');

// 读取文件
const content = fs.readFileSync('app/app.vue', 'utf8');
const lines = content.split('\n');

// 找到重复部分的开始和结束
let duplicateStart = -1;
let duplicateEnd = -1;

for (let i = 0; i < lines.length; i++) {
  // 找到第二个重复的开始（第1299行左右）
  if (i > 1290 && lines[i].includes('// 儀表板相關計算屬性') && duplicateStart === -1) {
    duplicateStart = i;
  }
  
  // 找到重复部分的结束（在圖片畫廊計算屬性之前）
  if (duplicateStart !== -1 && lines[i].includes('// 圖片畫廊計算屬性')) {
    duplicateEnd = i;
    break;
  }
}

if (duplicateStart !== -1 && duplicateEnd !== -1) {
  console.log(`找到重复部分: 行 ${duplicateStart + 1} 到 ${duplicateEnd}`);
  
  // 删除重复部分
  const newLines = [
    ...lines.slice(0, duplicateStart),
    ...lines.slice(duplicateEnd)
  ];
  
  // 写回文件
  fs.writeFileSync('app/app.vue', newLines.join('\n'));
  console.log('重复部分已删除');
} else {
  console.log('未找到重复部分');
}