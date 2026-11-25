import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

// iOS App：隱藏鍵盤上方系統的「^ ˅ ✓」工具列，練習頁有自己的工具列
export default defineNuxtPlugin(() => {
  if (Capacitor.getPlatform() !== 'ios') return
  void Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {})
})
