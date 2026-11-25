import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

// 打錯字母時輕震一下。只在 iOS / Android App 內生效，網頁版不做事
export function vibrateOnTypo() {
  if (!Capacitor.isNativePlatform()) return
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}
