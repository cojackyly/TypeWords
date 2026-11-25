import type { Word } from '@/core/types/types.ts'

/** 例句填空用的一句例句：目標字前後的文字，加上中文翻譯 */
export interface ClozeSentence {
  /** 原始英文例句 */
  text: string
  /** 空格前的文字 */
  before: string
  /** 空格後的文字 */
  after: string
  /** 中文翻譯 */
  cn: string
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 找出可以挖空的例句：例句中要有和單字完全相同的字（不分大小寫、前後不能接字母）。
 * 變化形（cancelled、canceling）第一版先不挖空。
 */
export function findClozeSentences(word: Word): ClozeSentence[] {
  const target = word?.word?.trim()
  if (!target) return []
  const pattern = new RegExp(`(^|[^A-Za-z])(${escapeRegExp(target)})(?![A-Za-z])`, 'i')
  const result: ClozeSentence[] = []
  for (const sentence of word.sentences ?? []) {
    const text = sentence?.c ?? ''
    const match = pattern.exec(text)
    if (!match) continue
    const start = match.index + match[1].length
    result.push({
      text,
      before: text.slice(0, start),
      after: text.slice(start + match[2].length),
      cn: sentence.cn ?? '',
    })
  }
  return result
}
