import { Capacitor } from '@capacitor/core'
import { set } from 'idb-keyval'
import { SyncDataType } from '../types/enum'
import { useBaseStore, useSettingStore } from '../stores'
import { ALL_SYNC_TYPES, applyRemoteDataByType, getDataVersion, getLocalPersistMeta } from './useDataSyncPersistence'

/**
 * 區網同步（手動按「同步」）
 *
 * 規則：每種資料（詞庫進度、設定、單字練習快取、文章練習快取）整份覆蓋，不逐字合併。
 * 判斷依據是「上次同步時記下的內容指紋（hash）」，只比對內容是否相同，不比較時間大小，
 * 所以兩台裝置的時鐘不準也不影響。
 * （不能只看 updated_at：App 下載資料後會用相同內容自動重存一次，updated_at 會變但內容沒變）
 *   - 只有這台改過 → 上傳
 *   - 只有另一台改過 → 下載
 *   - 兩邊都改過 → 詢問使用者要保留哪一邊
 */

const API_PATH = '/api/lan-sync'
// localStorage：使用者手動輸入的同步網址
const URL_STORAGE_KEY = 'typewords-lan-sync-url'
// localStorage：上次同步完成時，每種資料在本機與同步檔的 updated_at
const STATE_STORAGE_KEY = 'typewords-lan-sync-state'
// IndexedDB：下載覆蓋前，本機資料的備份（只留最近一份）
const BACKUP_IDB_KEY = 'typewords-lan-sync-backup'
const REQUEST_TIMEOUT_MS = 15000
// store 的執行期旗標，不屬於學習資料，算指紋時排除
const RUNTIME_FLAG_KEYS = new Set(['load', '_ignoreWatch'])

export type LanSyncRow = {
  type: SyncDataType
  data: unknown
  data_version?: number
  updated_at?: string
}

// hash：上次同步完成時，兩邊一致的資料內容指紋
type SyncedMark = { hash?: string }
type SyncState = Partial<Record<SyncDataType, SyncedMark>>

export type LanSyncConflictChoice = 'local' | 'remote' | 'cancel'

export type LanSyncResult = {
  pushed: SyncDataType[]
  pulled: SyncDataType[]
  cancelled: boolean
}

export class LanSyncConnectionError extends Error {}

function readState(): SyncState {
  try {
    return JSON.parse(localStorage.getItem(STATE_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeState(state: SyncState) {
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state))
}

/** 同步網址：手動設定 > 打包時帶入的預設值 > 電腦瀏覽器用目前網址（網頁由同步服務提供） */
export function getLanSyncUrl(): string {
  const saved = localStorage.getItem(URL_STORAGE_KEY)
  if (saved) return saved
  if (!Capacitor.isNativePlatform()) return window.location.origin
  return (useRuntimeConfig().public.lanSyncUrl as string) || ''
}

export function setLanSyncUrl(url: string) {
  localStorage.setItem(URL_STORAGE_KEY, url.trim().replace(/\/+$/, ''))
}

async function request(path: string, init?: RequestInit) {
  const base = getLanSyncUrl()
  if (!base) throw new LanSyncConnectionError('尚未設定同步網址')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(base + path, { ...init, signal: controller.signal })
  } catch (e) {
    throw new LanSyncConnectionError(`連不到同步服務（${base}）`)
  } finally {
    clearTimeout(timer)
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `同步服務回應錯誤 ${res.status}`)
  return body
}

/** 依 key 排序後序列化，讓內容相同但 key 順序不同的物件得到相同結果 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const obj = value as Record<string, unknown>
  return (
    '{' +
    Object.keys(obj)
      .filter(k => obj[k] !== undefined && !RUNTIME_FLAG_KEYS.has(k))
      .sort()
      .map(k => JSON.stringify(k) + ':' + stableStringify(obj[k]))
      .join(',') +
    '}'
  )
}

/** 內容指紋（FNV-1a 32 位元＋長度），只用來判斷「有沒有改過」 */
function contentHash(data: unknown): string {
  const text = stableStringify(data)
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16) + '-' + text.length
}

async function readLocalRow(type: SyncDataType): Promise<LanSyncRow | null> {
  const meta = await getLocalPersistMeta(type)
  if (!meta) return null
  return { type, data: meta.val ?? null, data_version: meta.version, updated_at: meta.updated_at }
}

export function useLanSync() {
  const store = useBaseStore()
  const settingStore = useSettingStore()

  async function sync(askConflict: () => Promise<LanSyncConflictChoice>): Promise<LanSyncResult> {
    const result: LanSyncResult = { pushed: [], pulled: [], cancelled: false }
    const remote = (await request(API_PATH)) as { rows?: Partial<Record<SyncDataType, LanSyncRow>> }
    const remoteRows = remote.rows ?? {}
    const state = readState()

    const localRows = new Map<SyncDataType, LanSyncRow | null>()
    const toPush: SyncDataType[] = []
    const toPull: SyncDataType[] = []
    const conflicts: SyncDataType[] = []

    for (const type of ALL_SYNC_TYPES) {
      const local = await readLocalRow(type)
      localRows.set(type, local)
      const remoteRow = remoteRows[type]
      const mark = state[type] ?? {}
      const localHash = local?.updated_at ? contentHash(local.data) : undefined
      const remoteHash = remoteRow?.updated_at ? contentHash(remoteRow.data) : undefined
      const localChanged = !!localHash && localHash !== mark.hash
      const remoteChanged = !!remoteHash && remoteHash !== mark.hash

      if (localChanged && remoteChanged) {
        // 兩邊內容其實一樣（例如第一次同步、或各自改成相同結果）
        if (localHash === remoteHash) {
          state[type] = { hash: localHash }
        } else {
          conflicts.push(type)
        }
      } else if (localChanged) {
        toPush.push(type)
      } else if (remoteChanged) {
        toPull.push(type)
      }
    }

    if (conflicts.length) {
      const choice = await askConflict()
      if (choice === 'cancel') {
        result.cancelled = true
        return result
      }
      ;(choice === 'local' ? toPush : toPull).push(...conflicts)
    }

    // 另一台用的是較新版本的資料格式時，這台無法正確讀取，先不下載
    const tooNew = toPull.filter(type => (remoteRows[type]?.data_version ?? 0) > getDataVersion(type))
    if (tooNew.length) {
      throw new Error('另一台裝置的 App 版本比較新，請先更新這台再同步')
    }

    if (toPull.length) {
      // 下載覆蓋前，先備份本機會被蓋掉的資料
      await set(BACKUP_IDB_KEY, {
        at: new Date().toISOString(),
        rows: toPull.map(type => localRows.get(type)).filter(Boolean),
      })
      for (const type of toPull) {
        const row = remoteRows[type]!
        await applyRemoteDataByType(type, { ...row, type } as any, store, settingStore)
        state[type] = { hash: contentHash(row.data) }
        result.pulled.push(type)
      }
    }

    if (toPush.length) {
      const rows = toPush.map(type => localRows.get(type)!)
      await request(API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      for (const row of rows) {
        state[row.type] = { hash: contentHash(row.data) }
        result.pushed.push(row.type)
      }
    }

    writeState(state)
    return result
  }

  return { sync }
}
