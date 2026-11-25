/**
 * 記憶宮殿（Method of Loci）
 *
 * - 宮殿 = 一條固定順序的路線，路線上有多個位置（locus）
 * - 每個位置放 WORDS_PER_LOCUS 個單字；一座宮殿放滿再用下一座，全部放滿就從頭循環
 * - 單字放在哪個位置會記住（settingStore.palaceAssignments），複習時沿用同一個位置
 */
import { nanoid } from 'nanoid'
import type { Word } from '@/core/types/types.ts'
import { ENV } from '@/core/config/env.ts'

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

/**
 * 單字圖進場的動作。圖和場景物件互動（撞上、掉進、冒出來），畫面越誇張越好記。
 * 動畫定義在 PalaceSceneCard.vue（palace-act-<動作>）。
 */
export type PalaceSlotAction = 'crash' | 'drop' | 'pop' | 'zoom' | 'swing' | 'float' | 'shiver' | 'bounce'

/** 一格的位置（百分比，指圖的中心）與進場動作 */
export interface PalaceSlotSpec {
  left: number
  top: number
  action: PalaceSlotAction
}

/**
 * 每個場景的兩格：圖放在場景物件上，不再浮在角落。
 * 第 1 格偏下（60% 以下）、第 2 格偏上（不高於 24%）：意思插圖放大時，兩格的圖和標籤（中文＋英文兩行）不重疊也不被切掉。
 */
export const PALACE_SCENE_SLOTS: Record<PalaceSceneKey, [PalaceSlotSpec, PalaceSlotSpec]> = {
  door: [
    { left: 38, top: 60, action: 'crash' }, // 撞上大門
    { left: 64, top: 24, action: 'drop' }, // 從門框上掉下來
  ],
  shoes: [
    { left: 32, top: 60, action: 'pop' }, // 從鞋櫃裡冒出來
    { left: 52, top: 24, action: 'zoom' }, // 出現在鏡子裡
  ],
  sofa: [
    { left: 32, top: 60, action: 'drop' }, // 一屁股坐上沙發
    { left: 52, top: 24, action: 'zoom' }, // 從畫框裡跑出來
  ],
  tv: [
    { left: 28, top: 68, action: 'bounce' }, // 在電視櫃上彈跳
    { left: 52, top: 30, action: 'zoom' }, // 從電視螢幕衝出來
  ],
  table: [
    { left: 34, top: 60, action: 'drop' }, // 掉進盤子
    { left: 54, top: 24, action: 'swing' }, // 吊在燈上晃
  ],
  fridge: [
    { left: 44, top: 60, action: 'pop' }, // 從冰箱門衝出來
    { left: 54, top: 24, action: 'shiver' }, // 在冷凍庫凍到發抖
  ],
  mirror: [
    { left: 36, top: 60, action: 'bounce' }, // 在洗手台濺水
    { left: 52, top: 25, action: 'zoom' }, // 出現在鏡子裡
  ],
  toilet: [
    { left: 42, top: 60, action: 'pop' }, // 從馬桶冒出來
    { left: 56, top: 24, action: 'drop' }, // 掉到水箱上
  ],
  bed: [
    { left: 34, top: 60, action: 'drop' }, // 倒在床上
    { left: 70, top: 24, action: 'float' }, // 飄在月亮旁邊
  ],
  desk: [
    { left: 26, top: 60, action: 'bounce' }, // 在書桌上彈跳
    { left: 52, top: 30, action: 'zoom' }, // 從螢幕衝出來
  ],
  room: [
    { left: 40, top: 60, action: 'drop' }, // 掉到桌上
    { left: 76, top: 28, action: 'pop' }, // 從櫃子裡冒出來
  ],
}

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
  /** 短中文意思，顯示在圖旁邊（圖只能勾起意思，意思本身要寫出來） */
  meaning: string
  /** 意思插圖網址；沒有時顯示 image（Emoji） */
  picture?: string
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

/** 短中文意思的最大字數：場景卡上空間小，只放第一個意思 */
const PALACE_MEANING_MAX_LENGTH = 8

/** 短中文意思：取第一個詞性的第一個意思，例如「操作員；話務員」→「操作員」 */
export function getShortMeaning(word: Pick<Word, 'trans'>) {
  // 詞庫的翻譯常帶雜訊：開頭的〈化〉(旅館…) 這類標記、後面黏著「形容詞:carbonous」這類詞形說明，先去掉
  const cn = (word.trans?.[0]?.cn ?? '')
    .replace(/^(\s*(〈[^〉]*〉|\([^)]*\)|（[^）]*）|\[[^\]]*\]))+/, '')
    .replace(/(形容詞|副詞|名詞|動詞|複數|過去式|過去分詞|現在分詞|比較級|最高級|第三人稱單數)\s*[:：].*$/, '')
  const first = cn.split(/[；;，,、]/).map(s => s.trim()).find(Boolean) ?? ''
  return first.length > PALACE_MEANING_MAX_LENGTH ? first.slice(0, PALACE_MEANING_MAX_LENGTH) + '…' : first
}

/** 意思插圖的網址：詞庫的 image 欄位；沒有插圖回傳空字串，畫面改用 Emoji */
export function getWordPicture(word: Pick<Word, 'image'>) {
  return word.image ? `${ENV.RESOURCE_URL}/images/word/${word.image}` : ''
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
