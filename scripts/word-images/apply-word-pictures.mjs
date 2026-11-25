#!/usr/bin/env node
/**
 * 把已經產生的意思插圖寫進詞庫的 image 欄位。
 *
 * 用法：node scripts/word-images/apply-word-pictures.mjs
 *
 * - 插圖放在 public/images/word/toeic/<單字>.jpg（gen-cloudflare.mjs 的輸出）
 * - 有檔案的字寫入 image: "toeic/<單字>.jpg"；沒有檔案的字移除 image，畫面繼續用 Emoji
 * - 每產生一批圖就跑一次
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const DICT_FILE = join(root, 'public/dicts/en/word/TOEIC.json')
const PICTURE_DIR = 'toeic'
const pictureRoot = join(root, 'public/images/word', PICTURE_DIR)

/** 檔名規則要和 gen-cloudflare.mjs 一致 */
const fileNameOf = word => word.trim().toLowerCase().replace(/[\s/]+/g, '-') + '.jpg'

const dict = JSON.parse(readFileSync(DICT_FILE, 'utf8'))
let withPicture = 0
for (const w of dict) {
  const file = fileNameOf(w.word)
  if (existsSync(join(pictureRoot, file))) {
    w.image = `${PICTURE_DIR}/${file}`
    withPicture++
  } else {
    delete w.image
  }
}
writeFileSync(DICT_FILE, JSON.stringify(dict))
console.log(`有插圖 ${withPicture} / ${dict.length} 字`)
