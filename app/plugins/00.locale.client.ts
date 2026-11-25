// 記住使用者選的介面語言（nuxt.config 關閉了瀏覽器語言偵測，第一次開啟一律使用預設的繁體中文）
// 用 localStorage 而不是 cookie：iOS App（capacitor://）的 cookie 不一定會保留
const LOCALE_STORAGE_KEY = 'typewords-locale'

export default defineNuxtPlugin(nuxtApp => {
  const i18n = nuxtApp.$i18n as any
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (saved && saved !== i18n.locale.value && i18n.locales.value.some((l: any) => l.code === saved)) {
    void i18n.setLocale(saved)
  }
  watch(i18n.locale, (code: string) => localStorage.setItem(LOCALE_STORAGE_KEY, code))
})
