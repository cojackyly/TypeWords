// 把詞庫／清單 JSON 裡的中文轉成台灣繁體（整個檔案轉換；key 都是英文，不受影響）
// 使用 'tw'（只轉字形）而不是 'twp'（連詞彙換成台灣用語）：
// 'twp' 會把「注销」換成「登出」、「文件」換成「檔案」，詞庫的意思會被改錯。
// 用法：node scripts/convert-zh-tw.mjs <檔案.json> [...更多檔案]
import fs from 'node:fs'
import * as OpenCC from 'opencc-js'

const opencc = OpenCC.Converter({ from: 'cn', to: 'tw' })
// OpenCC 會把「台」轉成正式寫法「臺」，改回日常寫法
const toTw = text => opencc(text).replace(/臺/g, '台')
for (const file of process.argv.slice(2)) {
  const raw = fs.readFileSync(file, 'utf8')
  const converted = toTw(raw)
  JSON.parse(converted) // 確認轉換後仍是合法 JSON
  fs.writeFileSync(file, converted)
  console.log(`${file}：${raw === converted ? '沒有需要轉換的字' : '已轉換'}`)
}
