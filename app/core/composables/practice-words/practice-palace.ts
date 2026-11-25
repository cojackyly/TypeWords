/**
 * 記憶宮殿（Method of Loci）
 *
 * - 宮殿 = 一條固定順序的路線，路線上有多個位置（locus）
 * - 每個位置放 WORDS_PER_LOCUS 個單字；一座宮殿放滿再用下一座，全部放滿就從頭循環
 * - 單字放在哪個位置會記住（settingStore.palaceAssignments），複習時沿用同一個位置
 */
import { nanoid } from 'nanoid'
import type { Word } from '@/core/types/types.ts'

export const WORDS_PER_LOCUS = 2

/** 位置場景（PalaceScene.vue 畫的插圖） */
export type PalaceSceneKey =
  | 'door'
  | 'shoes'
  | 'sofa'
  | 'tv'
  | 'table'
  | 'fridge'
  | 'mirror'
  | 'toilet'
  | 'bed'
  | 'desk'
  | 'room'

/** 場景選單：設定頁讓使用者替每個位置挑場景 */
export const PALACE_SCENE_OPTIONS: { key: PalaceSceneKey; label: string }[] = [
  { key: 'door', label: '🚪 大門' },
  { key: 'shoes', label: '👟 鞋櫃' },
  { key: 'sofa', label: '🛋️ 沙發' },
  { key: 'tv', label: '📺 電視' },
  { key: 'table', label: '🍽️ 餐桌' },
  { key: 'fridge', label: '🧊 冰箱' },
  { key: 'mirror', label: '🪞 鏡子' },
  { key: 'toilet', label: '🚽 馬桶' },
  { key: 'bed', label: '🛏️ 床' },
  { key: 'desk', label: '💻 書桌' },
  { key: 'room', label: '🏠 房間' },
]

/** 單字圖在場景上的位置（百分比，指圖的中心）：第 1 格在左下、第 2 格在右上，避開場景主體 */
export const PALACE_SLOT_ANCHORS: { left: number; top: number }[] = [
  { left: 26, top: 60 },
  { left: 76, top: 30 },
]

/**
 * 場景卡上一格的內容與狀態：
 * - active：目前這個字，圖放大並輕輕跳動
 * - dim：同一位置已經看過／答過的字，變淡
 * - blank：回想中，圖顯示、單字變成空格
 * - mystery：還沒輪到的字，只顯示問號
 */
export interface PalaceSlotItem {
  image: string
  word: string
  state: 'active' | 'dim' | 'blank' | 'mystery'
}

export interface Palace {
  id: string
  name: string
  icon: string
  loci: string[]
  /** 每個位置的場景；舊資料沒有這個欄位時依位置名稱推測 */
  scenes?: PalaceSceneKey[]
}

/** 單字放置紀錄：放在哪座宮殿的第幾個位置、第幾格，以及屬於哪一次放置 */
export interface PalaceAssignment {
  palaceId: string
  locus: number
  slot: number
  /** 放置批次（日期＋詞典），宮殿總覽用來找出「今天這一組」 */
  batch: string
}

export const DEFAULT_PALACE_LOCI = [
  '大門',
  '玄關鞋櫃',
  '客廳沙發',
  '電視',
  '餐桌',
  '廚房冰箱',
  '浴室鏡子',
  '馬桶',
  '臥室床',
  '書桌',
]

const DEFAULT_PALACE_SCENES: PalaceSceneKey[] = [
  'door',
  'shoes',
  'sofa',
  'tv',
  'table',
  'fridge',
  'mirror',
  'toilet',
  'bed',
  'desk',
]

export function createDefaultPalaces(): Palace[] {
  return [{ id: 'home', name: '我的家', icon: '🏠', loci: [...DEFAULT_PALACE_LOCI], scenes: [...DEFAULT_PALACE_SCENES] }]
}

/** 取位置的場景：有設定就用設定，否則依名稱關鍵字推測，都沒有就用通用房間 */
export function getLocusScene(palace: Palace | undefined, locus: number): PalaceSceneKey {
  const saved = palace?.scenes?.[locus]
  if (saved) return saved
  const name = palace?.loci[locus] ?? ''
  const index = DEFAULT_PALACE_LOCI.findIndex(n => name.includes(n.slice(-2)) || n.includes(name))
  return index >= 0 && name ? DEFAULT_PALACE_SCENES[index] : 'room'
}

/** 單字圖：詞庫的 emoji 欄位；沒有時回傳空字串，畫面改顯示首字母 */
export function getWordImage(word: Pick<Word, 'emoji'>) {
  return word.emoji?.trim() || ''
}

export function createPalace(name: string): Palace {
  return {
    id: nanoid(6),
    name,
    icon: '🏛️',
    loci: ['位置 1', '位置 2', '位置 3', '位置 4', '位置 5'],
    scenes: ['room', 'room', 'room', 'room', 'room'],
  }
}

/**
 * 依「這次放置的第幾個字」算出位置。
 * 從使用中的宮殿開始放，放滿換下一座，全部放滿就從頭循環。
 */
export function assignByOrder(
  palaces: Palace[],
  activePalaceId: string,
  order: number,
  batch: string
): PalaceAssignment | null {
  const usable = palaces.filter(p => p.loci.length > 0)
  if (!usable.length) return null
  const start = Math.max(0, usable.findIndex(p => p.id === activePalaceId))
  const ordered = [...usable.slice(start), ...usable.slice(0, start)]
  const total = ordered.reduce((sum, p) => sum + p.loci.length * WORDS_PER_LOCUS, 0)
  let rest = order % total
  for (const palace of ordered) {
    const capacity = palace.loci.length * WORDS_PER_LOCUS
    if (rest < capacity) {
      return {
        palaceId: palace.id,
        locus: Math.floor(rest / WORDS_PER_LOCUS),
        slot: rest % WORDS_PER_LOCUS,
        batch,
      }
    }
    rest -= capacity
  }
  return null
}

export function makePalaceBatch(dictId: string | number | undefined) {
  const d = new Date()
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${day}|${dictId ?? ''}`
}

export function getPalaceKey(word: Pick<Word, 'word'>) {
  return word.word.trim().toLowerCase()
}
