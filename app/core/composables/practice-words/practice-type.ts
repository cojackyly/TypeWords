import { WordPracticeType } from '@/core/types/enum.ts'

/**
 * 「整字判斷」類型：單字被遮住，打完按空白鍵才一次判斷對錯。
 * 默寫與例句填空都屬於這一類。
 */
export function isWholeWordJudgeType(type: WordPracticeType): boolean {
  return (
    type === WordPracticeType.Dictation ||
    type === WordPracticeType.Cloze ||
    type === WordPracticeType.PalaceRecall
  )
}
