import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.cojackyly.typewords',
  appName: 'TypeWords',
  webDir: '.output/public',
  plugins: {
    Keyboard: {
      // 鍵盤打開時不縮小網頁；練習頁用 visualViewport 自己算鍵盤高度
      resize: KeyboardResize.None,
    },
  },
};

export default config;
