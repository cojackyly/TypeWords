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
  /** 組句才有：空格前後的片段（文字，或同一句裡其他要背的字） */
  beforeParts?: ClozePart[]
  afterParts?: ClozePart[]
}

/**
 * 組句的一個片段：
 * - text：一般文字
 * - filled：這一輪已經填過的字，直接顯示
 * - pending：還沒輪到的字，顯示成空格
 */
export interface ClozePart {
  text: string
  kind: 'text' | 'filled' | 'pending'
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

/** 組句裡找單字：前後不能接字母或連字號（in-tray 要整個比對） */
function groupWordPattern(target: string) {
  return new RegExp(`(^|[^A-Za-z-])(${escapeRegExp(target)})(?![A-Za-z-])`, 'i')
}

/**
 * 組句填空：同一組的字互相搭配造的句子，一句有好幾個空格，照句中順序一個一個填。
 * - 目前這個字是正在打的空格
 * - 這一輪排在它前面的字（已經填過）直接顯示，排在後面的顯示成空格
 * - 句子裡不屬於這一輪的字（每組字數被改過時會發生）當一般文字顯示
 * 這個字沒有組句、或句子裡找不到它時回傳 null，改用一般例句。
 */
export function findGroupClozeSentence(word: Word, sessionWords: Word[], index: number): ClozeSentence | null {
  const group = word?.groupSentence
  const target = word?.word?.trim()
  if (!group?.en || !target) return null
  const own = groupWordPattern(target).exec(group.en)
  if (!own) return null
  const ownStart = own.index + own[1].length
  const ownEnd = ownStart + own[2].length

  // 其他要背的字在句中的位置
  const marks: { start: number; end: number; kind: ClozePart['kind'] }[] = []
  for (const other of group.words ?? []) {
    if (other.toLowerCase() === target.toLowerCase()) continue
    const match = groupWordPattern(other).exec(group.en)
    if (!match) continue
    const position = sessionWords.findIndex(w => w.word.toLowerCase() === other.toLowerCase())
    if (position < 0) continue
    const start = match.index + match[1].length
    marks.push({ start, end: start + match[2].length, kind: position < index ? 'filled' : 'pending' })
  }
  marks.sort((a, b) => a.start - b.start)

  const slice = (from: number, to: number): ClozePart[] => {
    const parts: ClozePart[] = []
    let cursor = from
    for (const mark of marks) {
      if (mark.start < from || mark.end > to) continue
      if (mark.start > cursor) parts.push({ text: group.en.slice(cursor, mark.start), kind: 'text' })
      parts.push({ text: group.en.slice(mark.start, mark.end), kind: mark.kind })
      cursor = mark.end
    }
    if (cursor < to) parts.push({ text: group.en.slice(cursor, to), kind: 'text' })
    return parts
  }

  return {
    text: group.en,
    before: group.en.slice(0, ownStart),
    after: group.en.slice(ownEnd),
    cn: group.cn ?? '',
    beforeParts: slice(0, ownStart),
    afterParts: slice(ownEnd, group.en.length),
  }
}

/**
 * 依組句排序：同一句的字排在一起，並照句中出現的順序，這樣空格會由左到右一個一個填。
 * 沒有組句的字維持原本的相對順序，排在最後。
 */
export function sortByGroupSentence(words: Word[]): Word[] {
  const NO_SENTENCE = Number.MAX_SAFE_INTEGER
  const keyOf = (word: Word) => {
    const group = word.groupSentence
    if (!group) return [NO_SENTENCE, 0]
    const position = (group.words ?? []).findIndex(w => w.toLowerCase() === word.word.toLowerCase())
    return [group.id, position < 0 ? NO_SENTENCE : position]
  }
  return words
    .map((word, order) => ({ word, order, key: keyOf(word) }))
    .sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.order - b.order)
    .map(item => item.word)
}
