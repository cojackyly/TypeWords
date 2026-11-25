// 把單字圖（scripts/word-images/<名稱>.json：{ 單字: "Emoji 組合" }）寫進詞庫的 emoji 欄位
// 用法：node scripts/apply-word-images.mjs <單字圖.json> <詞庫.json>
import fs from 'node:fs'

const [imageFile, dictFile] = process.argv.slice(2)
if (!imageFile || !dictFile) {
  console.error('用法：node scripts/apply-word-images.mjs <單字圖.json> <詞庫.json>')
  process.exit(1)
}
const images = JSON.parse(fs.readFileSync(imageFile, 'utf8'))
const byLower = new Map(Object.entries(images).map(([k, v]) => [k.toLowerCase(), v]))
const words = JSON.parse(fs.readFileSync(dictFile, 'utf8'))
let applied = 0
for (const w of words) {
  const image = byLower.get(String(w.word).toLowerCase())
  if (image) {
    w.emoji = image
    applied++
  }
}
fs.writeFileSync(dictFile, JSON.stringify(words))
const known = new Set(words.map(w => String(w.word).toLowerCase()))
const missing = [...byLower.keys()].filter(k => !known.has(k))
console.log(`寫入 ${applied} 個單字圖；詞庫共 ${words.length} 字；單字圖檔有、詞庫沒有：${missing.length ? missing.join(', ') : '無'}`)
