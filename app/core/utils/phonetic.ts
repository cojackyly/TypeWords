/**
 * 音標：把詞庫的 IPA 國際音標轉成台灣常用的 KK 音標再顯示。
 *
 * KK 記的是美式發音，所以優先用美式 IPA（phonetic1），沒有才用英式（phonetic0）。
 * 這是規則轉換，不是查字典：大部分的字和 KK 字典一致，少數字會有出入——
 * - 非重音節的 ɪ／ə 各家字典不同（calendar：IPA 寫 ɪ，KK 字典寫 ə）
 * - 詞庫的 IPA 沒標次重音時，KK 的次重音（͵）也不會出現
 * - 字尾的 -tion／-sion（ʃn、ʒn）會補上 ə；其他音節化子音不補
 */

// 轉換過程用的暫存記號：先把「會被後面規則誤改」的音換成記號，最後再換回 KK 符號
const HOLD_E = '\u0001' // eɪ → e
const HOLD_O = '\u0002' // oʊ／əʊ → o
const HOLD_I = '\u0003' // iː → i
const HOLD_U = '\u0004' // uː → u

// ər 後面接母音時 r 屬於下一個音節（operate：ə-reɪt），不能合成捲舌音 ɚ
const VOWELS = 'ɑæeɛiɪoɔuʊʌəaɝɚ'

/** IPA（英式或美式）→ KK。傳入不含斜線的音標；空字串回傳空字串 */
export function ipaToKK(ipa: string | undefined | null): string {
  let s = (ipa ?? '').trim()
  if (!s) return ''
  s = s.replace(/^[/[]+|[/\]]+$/g, '').trim()
  // 英式的 ə(r)：括號裡的 r 在美式會發音
  s = s.replace(/[()]/g, '')
  // 重音：IPA 的 ˈ ˌ → KK 的 ˋ ͵
  s = s.replace(/[ˈ']/g, 'ˋ').replace(/ˌ/g, '͵')
  s = s.replace(/ɡ/g, 'g')
  // 捲舌母音
  s = s.replace(/ɜ[ː:]?r|ɝ[ː:]/g, 'ɝ').replace(/ɜ[ː:]?/g, 'ɝ')
  s = s.replace(new RegExp(`ər(?![${VOWELS}])`, 'g'), 'ɚ')
  // 雙母音與長母音：先換成暫存記號，避免被下面的 e→ɛ、i→ɪ、u→ʊ 改掉
  s = s.replace(/eɪ/g, HOLD_E).replace(/oʊ|əʊ/g, HOLD_O)
  s = s.replace(/i[ː:]/g, HOLD_I).replace(/u[ː:]/g, HOLD_U)
  s = s.replace(/ɑ[ː:]|ɒ/g, 'ɑ').replace(/ɔ[ː:]/g, 'ɔ')
  // -tion／-sion：IPA 常寫成 ʃn、ʒn，KK 字典寫 ʃən、ʒən
  s = s.replace(new RegExp(`([ʃʒ])n(?![${VOWELS}])`, 'g'), '$1ən')
  // KK 不寫長音符號
  s = s.replace(/[ː:]/g, '')
  // 短母音：IPA 的 e、i、u 在 KK 寫成 ɛ、ɪ、ʊ
  s = s.replace(/e/g, 'ɛ').replace(/i/g, 'ɪ').replace(/u/g, 'ʊ')
  return s.replaceAll(HOLD_E, 'e').replaceAll(HOLD_O, 'o').replaceAll(HOLD_I, 'i').replaceAll(HOLD_U, 'u')
}

/** 單字的 KK 音標：優先用美式 IPA 轉，沒有才用英式 */
export function getKKPhonetic(word: { phonetic0?: string; phonetic1?: string } | undefined | null): string {
  return ipaToKK(word?.phonetic1 || word?.phonetic0)
}
