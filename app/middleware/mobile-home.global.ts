import { isMobile } from '@/core/utils'

// 手機開啟時跳過行銷首頁，直接進單字頁
export default defineNuxtRouteMiddleware(to => {
  if (import.meta.server) return
  if (to.path === '/' && isMobile()) return navigateTo('/words', { replace: true })
})
