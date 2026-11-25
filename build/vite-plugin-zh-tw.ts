// 打包時把 app/ 原始碼裡的中文（含寫死的簡體字）轉成台灣繁體，原始碼本身不動。
// 這個 fork 只給自己用、預設繁體中文；不改原始碼是為了之後合併原作者更新時少衝突。
// i18n/locales/*.json 不在 app/ 底下，不受影響（各語系照原檔顯示）。
import type { Plugin } from 'vite'
import * as OpenCC from 'opencc-js'

const CJK = /[一-鿿]/
// 只處理這些副檔名（含 .vue 的 SFC 原始碼）
const SOURCE_EXT = /\.(vue|ts|tsx|js|mjs|json)$/

export function zhTwPlugin(appDir: string): Plugin {
  const opencc = OpenCC.Converter({ from: 'cn', to: 'twp' })
  // OpenCC 會把「台」轉成正式寫法「臺」，改回日常寫法
  const toTw = (text: string) => opencc(text).replace(/臺/g, '台')
  const appPrefix = appDir.replace(/\\/g, '/').replace(/\/?$/, '/')
  return {
    name: 'typewords-zh-tw',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0].replace(/\\/g, '/')
      if (!file.startsWith(appPrefix) || file.includes('/node_modules/')) return null
      if (!SOURCE_EXT.test(file) || !CJK.test(code)) return null
      const converted = toTw(code)
      return converted === code ? null : { code: converted, map: null }
    },
  }
}
