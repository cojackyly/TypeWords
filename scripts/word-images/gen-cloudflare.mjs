#!/usr/bin/env node
/**
 * 用 Cloudflare Workers AI（FLUX.1 schnell）替單字產生「意思插圖」。
 *
 * 用法：
 *   node scripts/word-images/gen-cloudflare.mjs <輸出資料夾> [單字數上限]
 *
 * 需要環境變數：
 *   CLOUDFLARE_ACCOUNT_ID、CLOUDFLARE_API_TOKEN（Workers AI 權限）
 *
 * - 畫面描述讀 scripts/word-images/prompts-toeic.json（單字 → 英文場景描述）
 * - 每張存成 <輸出資料夾>/<單字>.jpg，已存在就略過，所以中斷後可以重跑接續
 * - 存檔後用 macOS 內建的 sips 縮成 512px，減少 App 大小
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODEL = '@cf/black-forest-labs/flux-1-schnell'
// FLUX.1 schnell 在 Cloudflare 上最多 8 步；4 步速度和品質最平衡
const STEPS = 4
const OUTPUT_SIZE_PX = 512
// 免費額度有每分鐘請求上限，每張之間稍微停一下
const DELAY_MS = 1500
// 統一畫風：扁平插畫、白底、不要文字（模型常會亂畫字母）
const STYLE =
  'flat vector illustration, friendly cartoon style, bright clear colors, simple clean shapes, plain white background, centered, no text, no letters, no words, any signs, papers or screens are blank'
// 連續失敗幾次就停：通常是今天的免費額度用完，繼續打只會一直失敗
const MAX_CONSECUTIVE_FAILURES = 3

const here = dirname(fileURLToPath(import.meta.url))
const [, , outDir, limitArg] = process.argv
const { CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_API_TOKEN: token } = process.env

if (!outDir) {
  console.error('用法：node gen-cloudflare.mjs <輸出資料夾> [單字數上限]')
  process.exit(1)
}
if (!accountId || !token) {
  console.error('缺少環境變數 CLOUDFLARE_ACCOUNT_ID 或 CLOUDFLARE_API_TOKEN')
  process.exit(1)
}

const prompts = JSON.parse(readFileSync(join(here, 'prompts-toeic.json'), 'utf8'))
const entries = Object.entries(prompts).slice(0, limitArg ? Number(limitArg) : undefined)
mkdirSync(outDir, { recursive: true })

/** 檔名：小寫、空白與斜線換成連字號 */
const fileNameOf = word => word.trim().toLowerCase().replace(/[\s/]+/g, '-') + '.jpg'

async function generate(scene) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: `${scene}. ${STYLE}`, steps: STEPS }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.success || !body?.result?.image) {
    throw new Error(`HTTP ${res.status} ${JSON.stringify(body?.errors ?? body).slice(0, 300)}`)
  }
  return Buffer.from(body.result.image, 'base64')
}

let made = 0
let skipped = 0
let consecutiveFailures = 0
const failed = []
for (const [word, scene] of entries) {
  const file = join(outDir, fileNameOf(word))
  if (existsSync(file)) {
    skipped++
    continue
  }
  try {
    writeFileSync(file, await generate(scene))
    execFileSync('sips', ['-Z', String(OUTPUT_SIZE_PX), file], { stdio: 'ignore' })
    made++
    consecutiveFailures = 0
    console.log(`✓ ${word}`)
  } catch (e) {
    failed.push(word)
    consecutiveFailures++
    console.error(`✗ ${word}：${e.message}`)
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`連續失敗 ${MAX_CONSECUTIVE_FAILURES} 次，先停下。多半是今天的免費額度用完，明天重跑會從還沒產生的字接續。`)
      break
    }
  }
  await new Promise(r => setTimeout(r, DELAY_MS))
}
console.log(`完成：新產生 ${made}，略過 ${skipped}，失敗 ${failed.length}${failed.length ? '（' + failed.join(', ') + '）' : ''}`)
if (failed.length) process.exit(2)
