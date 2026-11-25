import { onMounted, onUnmounted, ref } from 'vue'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

// 練習頁用來叫出手機鍵盤的隱藏輸入框（由 event.ts 建立）
export const TYPING_LISTENER_ID = 'typing-listener'
// 掛在 <html> 上的 CSS 變數：鍵盤擋住的高度，給「鍵盤上方工具列」定位
const KEYBOARD_OFFSET_VAR = '--mobile-keyboard-offset'
// 鍵盤擋住的高度超過這個值才算鍵盤打開（排除網址列伸縮等小變化）
const KEYBOARD_MIN_HEIGHT = 120

function getTypingListener() {
  return document.getElementById(TYPING_LISTENER_ID) as HTMLInputElement | null
}

// 收起手機鍵盤（例如完成頁、對話框打開時）
export function closeMobileKeyboard() {
  getTypingListener()?.blur()
}

/**
 * 追蹤手機螢幕鍵盤是否打開，並提供打開 / 收起鍵盤的方法。
 * - iOS / Android App：使用 Capacitor Keyboard 外掛的事件取得鍵盤高度
 *   （capacitor.config 設定 resize: None，網頁不會被縮小，visualViewport 也量不到鍵盤）
 * - 手機瀏覽器：鍵盤只縮小 visualViewport，用它算出鍵盤高度
 */
export function useMobileKeyboard() {
  const isOpen = ref(false)
  const isNative = Capacitor.isNativePlatform()
  // App 內由鍵盤事件更新的鍵盤高度
  let nativeKeyboardHeight = 0
  const nativeListeners: PluginListenerHandle[] = []

  function getKeyboardOffset() {
    if (isNative) return nativeKeyboardHeight
    const vv = window.visualViewport
    return vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0
  }

  function update() {
    const offset = getKeyboardOffset()
    document.documentElement.style.setProperty(KEYBOARD_OFFSET_VAR, `${offset}px`)
    isOpen.value = offset > KEYBOARD_MIN_HEIGHT && document.activeElement?.id === TYPING_LISTENER_ID
  }

  function open() {
    getTypingListener()?.focus()
  }

  onMounted(async () => {
    if (isNative) {
      nativeListeners.push(
        await Keyboard.addListener('keyboardWillShow', info => {
          nativeKeyboardHeight = info.keyboardHeight
          update()
        }),
        await Keyboard.addListener('keyboardWillHide', () => {
          nativeKeyboardHeight = 0
          update()
        })
      )
    }
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    update()
  })

  onUnmounted(() => {
    nativeListeners.forEach(l => void l.remove())
    window.visualViewport?.removeEventListener('resize', update)
    window.visualViewport?.removeEventListener('scroll', update)
    document.removeEventListener('focusin', update)
    document.removeEventListener('focusout', update)
  })

  return { isOpen, open, close: closeMobileKeyboard }
}
