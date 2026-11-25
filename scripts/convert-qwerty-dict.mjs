// 把 qwerty-learner 格式的詞庫（[{ name, trans: ['n. 中文'], usphone, ukphone }]）轉成 TypeWords 的單字格式
// 用法：node scripts/convert-qwerty-dict.mjs <來源.json> <輸出.json> <id 起始值>
import fs from 'node:fs'

const [src, out, idStartArg] = process.argv.slice(2)
if (!src || !out || !idStartArg) {
  console.error('用法：node scripts/convert-qwerty-dict.mjs <來源.json> <輸出.json> <id 起始值>')
  process.exit(1)
}
const idStart = Number(idStartArg)

// 「n. 约会, 约定」→ { pos: 'n.', cn: '约会, 约定' }；沒有詞性時 pos 為空字串
function parseTrans(line) {
  const match = /^\s*((?:[a-z]+\.\s*&?\s*)+)\s*(.*)$/i.exec(line ?? '')
  return match ? { pos: match[1].replace(/\s+/g, ''), cn: match[2].trim() } : { pos: '', cn: (line ?? '').trim() }
}

// 單字只收英文字母、連字號、撇號、空白（排除 'sonnel2'、'buyout/buy' 這類資料錯誤）
const VALID_WORD = /^[A-Za-z][A-Za-z' -]*$/
// 不是翻譯的行：時態、詞形變化、英文辭典網頁殘留
const NOT_TRANSLATION = /^(时\s*态|复\s*数|名\s*词|形\s*容\s*词|动\s*词|副\s*词)\s*[:：]|^also\b|^\d+\.\s|ENTRIES FOUND|definition/i
const HAS_CHINESE = /[\u4e00-\u9fff]/

function isTranslationLine(line) {
  return HAS_CHINESE.test(line ?? '') && !NOT_TRANSLATION.test(line)
}

const source = JSON.parse(fs.readFileSync(src, 'utf8'))
const seen = new Set()
const words = []
for (const item of source) {
  const word = (item?.name ?? '').trim()
  const key = word.toLowerCase()
  // 沒有任何中文翻譯的字多半是拼錯的資料（duplicte、collegue），不收
  const transLines = (item?.trans ?? []).filter(isTranslationLine)
  if (!word || !VALID_WORD.test(word) || !transLines.length || seen.has(key)) continue
  seen.add(key)
  words.push({
    id: idStart + words.length,
    word,
    phonetic0: item.ukphone ?? '',
    phonetic1: item.usphone ?? '',
    trans: transLines.map(parseTrans).filter(t => t.cn),
    sentences: [],
    phrases: [],
    synos: [],
    relWords: { root: '', rels: [] },
    etymology: [],
  })
}
fs.writeFileSync(out, JSON.stringify(words))
console.log(`來源 ${source.length} 筆 → 輸出 ${words.length} 個單字（移除重複、拼錯、無翻譯 ${source.length - words.length} 筆）`)
