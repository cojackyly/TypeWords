#!/usr/bin/env node
/**
 * 把組句寫進詞庫：每個字加上 sense（這一句裡的意思）和 groupSentence（它所在的那一句）。
 *
 * 用法：node scripts/apply-group-sentences.mjs
 *
 * 來源：scripts/group-sentences/toeic.json
 *   [{ words: [...5 個字], senses: { 字: 短中文 }, sentences: [{ en, cn, words: [...] }] }]
 * 每一組是詞庫裡連續的 5 個字；句子的 id 是全詞庫的流水號，App 用它把同一句的字排在一起。
 * 檢查不通過就不寫檔。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const DICT_FILE = join(root, 'public/dicts/en/word/TOEIC.json')
const SOURCE_FILE = join(root, 'scripts/group-sentences/toeic.json')
const SENSE_MAX_LENGTH = 8

const dict = JSON.parse(readFileSync(DICT_FILE, 'utf8'))
const groups = JSON.parse(readFileSync(SOURCE_FILE, 'utf8'))
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasWord = (sentence, word) => new RegExp(`(^|[^A-Za-z-])${escapeRegExp(word)}(?![A-Za-z-])`, 'i').test(sentence)

const problems = []
const byWord = new Map()
let sentenceId = 0
let cursor = 0
for (const group of groups) {
  const expected = dict.slice(cursor, cursor + group.words.length).map(w => w.word)
  if (JSON.stringify(expected) !== JSON.stringify(group.words)) problems.push(`組的字和詞庫順序不一致：${group.words.join(', ')}`)
  cursor += group.words.length
  const used = new Map()
  for (const sentence of group.sentences) {
    const id = sentenceId++
    for (const word of sentence.words) {
      if (!group.words.includes(word)) problems.push(`「${word}」不屬於這一組`)
      if (used.has(word)) problems.push(`「${word}」出現在兩句裡`)
      if (!hasWord(sentence.en, word)) problems.push(`句中找不到「${word}」：${sentence.en}`)
      used.set(word, { id, en: sentence.en, cn: sentence.cn, words: sentence.words })
    }
  }
  for (const word of group.words) {
    const sense = group.senses?.[word]?.trim()
    if (!used.has(word)) problems.push(`「${word}」沒有被任何一句用到`)
    if (!sense || sense.length > SENSE_MAX_LENGTH) problems.push(`「${word}」的意思不合格：${sense}`)
    byWord.set(word, { sense, groupSentence: used.get(word) })
  }
}
if (cursor !== dict.length) problems.push(`組句涵蓋 ${cursor} 字，詞庫有 ${dict.length} 字`)

if (problems.length) {
  console.error(`檢查不通過（${problems.length} 項），沒有寫檔：`)
  problems.slice(0, 30).forEach(p => console.error(' - ' + p))
  process.exit(1)
}

for (const word of dict) {
  const item = byWord.get(word.word)
  word.sense = item.sense
  word.groupSentence = item.groupSentence
}
writeFileSync(DICT_FILE, JSON.stringify(dict))
console.log(`寫入 ${dict.length} 個字、${sentenceId} 句`)
