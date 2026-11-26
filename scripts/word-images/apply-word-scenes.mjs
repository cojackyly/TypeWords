#!/usr/bin/env node
/**
 * 把「單字的明確場景」寫進詞庫的 scene 欄位，記憶宮殿用它挑背景圖。
 *
 * 用法：node scripts/word-images/apply-word-scenes.mjs
 *
 * - 對照表：scripts/word-images/scenes-toeic.tsv（序號、單字、場景 id、信心 high/low）
 * - 只有信心 high 的字寫入 scene；抽象字（low）沒有明確場景，不放背景（使用者 2026-11-26 決定）
 * - 背景圖放在 public/images/scene/toeic/<場景id>.jpg（gen-local-klein.py --scene 的輸出）；沒有圖的場景不寫入
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const DICT_FILE = join(root, 'public/dicts/en/word/TOEIC.json')
const TABLE_FILE = join(root, 'scripts/word-images/scenes-toeic.tsv')
const SCENE_DIR = join(root, 'public/images/scene/toeic')
const CONFIDENT = 'high'

const dict = JSON.parse(readFileSync(DICT_FILE, 'utf8'))
const rows = readFileSync(TABLE_FILE, 'utf8').trim().split('\n').slice(1).map(line => line.split('\t'))

// 檢查：對照表要和詞庫逐字對得上，不然不寫檔
const problems = []
if (rows.length !== dict.length) problems.push(`對照表 ${rows.length} 行，詞庫 ${dict.length} 字`)
for (const [index, word] of rows) {
  if (dict[+index]?.word !== word) problems.push(`第 ${index} 筆：對照表是 ${word}，詞庫是 ${dict[+index]?.word}`)
}
if (problems.length) {
  console.error('對照表和詞庫對不上，沒有寫檔：\n' + problems.slice(0, 10).join('\n'))
  process.exit(1)
}

let withScene = 0
const missingImage = new Set()
for (const [index, , scene, confidence] of rows) {
  const word = dict[+index]
  if (confidence === CONFIDENT && existsSync(join(SCENE_DIR, `${scene}.jpg`))) {
    word.scene = scene
    withScene++
  } else {
    if (confidence === CONFIDENT) missingImage.add(scene)
    delete word.scene
  }
}
writeFileSync(DICT_FILE, JSON.stringify(dict))
console.log(`有場景 ${withScene} / ${dict.length} 字`)
if (missingImage.size) console.log(`這些場景沒有背景圖，字不放背景：${[...missingImage].join(', ')}`)
