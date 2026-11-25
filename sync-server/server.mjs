// TypeWords 區網同步服務（只給自己用）
//
// 用途：
//   1. 提供 /api/lan-sync，讓手機 App 與電腦瀏覽器把學習資料存到這台 Mac 的同步檔
//   2. 提供 .output/public 的網頁，電腦直接開 http://localhost:<port> 使用
//
// 啟動：pnpm sync-server（會先打包網頁）
// 資料：~/TypeWordsSync/sync.json；每次寫入前備份到 ~/TypeWordsSync/backups/
// 不需要任何第三方套件。

import http from 'node:http'
import fs from 'node:fs/promises'
import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const PORT = Number(process.env.TYPEWORDS_SYNC_PORT || 8790)
const DATA_DIR = process.env.TYPEWORDS_SYNC_DIR || path.join(os.homedir(), 'TypeWordsSync')
const SYNC_FILE = path.join(DATA_DIR, 'sync.json')
const BACKUP_DIR = path.join(DATA_DIR, 'backups')
const MAX_BACKUPS = 30
const MAX_BODY_BYTES = 100 * 1024 * 1024
const API_PATH = '/api/lan-sync'
// 允許同步的資料種類（對應前端 SyncDataType）
const SYNC_TYPES = new Set(['dict', 'setting', 'practice_word', 'practice_article'])

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const WEB_DIR = path.resolve(ROOT, '..', '.output', 'public')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

async function readSyncFile() {
  try {
    const parsed = JSON.parse(await fs.readFile(SYNC_FILE, 'utf8'))
    return parsed && typeof parsed.rows === 'object' ? parsed : { rows: {} }
  } catch (e) {
    if (e.code === 'ENOENT') return { rows: {} }
    throw e
  }
}

async function backupSyncFile() {
  if (!existsSync(SYNC_FILE)) return
  await fs.mkdir(BACKUP_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  await fs.copyFile(SYNC_FILE, path.join(BACKUP_DIR, `sync-${stamp}.json`))
  const files = (await fs.readdir(BACKUP_DIR)).filter(f => f.startsWith('sync-')).sort()
  for (const f of files.slice(0, Math.max(0, files.length - MAX_BACKUPS))) {
    await fs.unlink(path.join(BACKUP_DIR, f))
  }
}

async function writeSyncFile(content) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tmp = SYNC_FILE + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(content))
  await fs.rename(tmp, SYNC_FILE)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', c => {
      size += c.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('資料太大'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

// 一次只處理一個寫入，避免手機和電腦同時按同步時互相蓋掉
let writeQueue = Promise.resolve()

async function handleApi(req, res) {
  if (req.method === 'GET') {
    sendJson(res, 200, await readSyncFile())
    return
  }
  if (req.method === 'POST') {
    const body = JSON.parse(await readBody(req))
    const rows = Array.isArray(body?.rows) ? body.rows : []
    const invalid = rows.find(r => !SYNC_TYPES.has(r?.type) || typeof r?.updated_at !== 'string')
    if (invalid) {
      sendJson(res, 400, { error: `資料格式不正確：${invalid?.type}` })
      return
    }
    const result = (writeQueue = writeQueue.then(async () => {
      const content = await readSyncFile()
      await backupSyncFile()
      for (const r of rows) {
        content.rows[r.type] = { data: r.data, data_version: r.data_version, updated_at: r.updated_at }
      }
      content.saved_at = new Date().toISOString()
      await writeSyncFile(content)
      return content
    }))
    await result
    sendJson(res, 200, { ok: true, types: rows.map(r => r.type) })
    return
  }
  sendJson(res, 405, { error: 'Method Not Allowed' })
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file = path.join(WEB_DIR, urlPath)
  if (!file.startsWith(WEB_DIR)) {
    res.writeHead(403).end()
    return
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html')
  // SPA：找不到檔案時回傳 200.html，交給前端路由
  if (!existsSync(file)) file = path.join(WEB_DIR, '200.html')
  if (!existsSync(file)) {
    res.writeHead(404).end('找不到網頁檔案，請先執行 pnpm generate:app')
    return
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
  createReadStream(file).pipe(res)
}

const server = http.createServer(async (req, res) => {
  // 手機 App 的來源是 capacitor://localhost，需要允許跨來源
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }
  try {
    if (req.url.startsWith(API_PATH)) await handleApi(req, res)
    else serveStatic(req, res)
  } catch (e) {
    console.error('[lan-sync]', e)
    sendJson(res, e.status || 500, { error: e.message || String(e) })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  let host = os.hostname().replace(/\.local$/, '')
  try {
    // macOS 的 Bonjour 名稱（手機用 <名稱>.local 連線）
    host = execSync('scutil --get LocalHostName').toString().trim()
  } catch {}
  console.log(`TypeWords 同步服務已啟動`)
  console.log(`  電腦使用：http://localhost:${PORT}`)
  console.log(`  手機同步網址：http://${host}.local:${PORT}`)
  console.log(`  同步檔：${SYNC_FILE}`)
})
