<script setup lang="ts">
// 記憶宮殿的位置場景：用 SVG 畫的扁平插圖（離線、檔案小）。
// 單字圖（Emoji）由外層依 PALACE_SCENE_ANCHORS 的位置疊在場景上。
import type { PalaceSceneKey } from '@/core/composables/practice-words/practice-palace.ts'

defineProps<{ scene: PalaceSceneKey }>()
</script>

<template>
  <svg class="palace-scene" viewBox="0 0 390 300" preserveAspectRatio="xMidYMid slice">
    <!-- 大門 -->
    <g v-if="scene === 'door'">
      <rect width="390" height="300" fill="#fde7c7" />
      <rect y="215" width="390" height="85" fill="#c08457" />
      <rect y="215" width="390" height="7" fill="#a16207" />
      <rect x="36" y="50" width="70" height="86" rx="6" fill="#bae6fd" stroke="#fff" stroke-width="6" />
      <rect x="284" y="50" width="70" height="86" rx="6" fill="#bae6fd" stroke="#fff" stroke-width="6" />
      <rect x="140" y="30" width="110" height="190" rx="8" fill="#7c2d12" />
      <rect x="150" y="42" width="90" height="168" rx="6" fill="#9a3412" />
      <rect x="160" y="54" width="70" height="62" rx="4" fill="#7c2d12" />
      <rect x="160" y="126" width="70" height="74" rx="4" fill="#7c2d12" />
      <circle cx="228" cy="132" r="7" fill="#facc15" />
      <rect x="120" y="218" width="150" height="12" rx="4" fill="#78350f" />
      <ellipse cx="195" cy="258" rx="66" ry="13" fill="#16a34a" opacity=".85" />
    </g>

    <!-- 玄關鞋櫃 -->
    <g v-else-if="scene === 'shoes'">
      <rect width="390" height="300" fill="#ede9fe" />
      <rect y="230" width="390" height="70" fill="#a8a29e" />
      <rect x="60" y="120" width="270" height="110" rx="8" fill="#92400e" />
      <rect x="70" y="130" width="120" height="90" rx="4" fill="#b45309" />
      <rect x="200" y="130" width="120" height="90" rx="4" fill="#b45309" />
      <circle cx="180" cy="175" r="5" fill="#fde68a" />
      <circle cx="210" cy="175" r="5" fill="#fde68a" />
      <rect x="150" y="40" width="90" height="70" rx="45" fill="#e0f2fe" stroke="#a16207" stroke-width="5" />
      <path d="M85 236 q15 -14 34 0 z" fill="#1f2937" />
      <path d="M270 236 q15 -14 34 0 z" fill="#dc2626" />
    </g>

    <!-- 客廳沙發 -->
    <g v-else-if="scene === 'sofa'">
      <rect width="390" height="300" fill="#e0e7ff" />
      <rect y="230" width="390" height="70" fill="#a8a29e" />
      <rect x="150" y="30" width="90" height="66" rx="4" fill="#fff" stroke="#a16207" stroke-width="6" />
      <path d="M160 88 L185 60 L200 76 L215 52 L232 88 Z" fill="#86efac" />
      <rect x="40" y="128" width="310" height="70" rx="28" fill="#2563eb" />
      <rect x="40" y="162" width="310" height="62" rx="18" fill="#1d4ed8" />
      <rect x="20" y="146" width="50" height="88" rx="22" fill="#1e40af" />
      <rect x="320" y="146" width="50" height="88" rx="22" fill="#1e40af" />
      <rect x="85" y="150" width="100" height="36" rx="14" fill="#3b82f6" />
      <rect x="205" y="150" width="100" height="36" rx="14" fill="#3b82f6" />
    </g>

    <!-- 電視 -->
    <g v-else-if="scene === 'tv'">
      <rect width="390" height="300" fill="#f1f5f9" />
      <rect y="225" width="390" height="75" fill="#d6d3d1" />
      <rect x="70" y="190" width="250" height="40" rx="6" fill="#57534e" />
      <rect x="95" y="40" width="200" height="130" rx="10" fill="#111827" />
      <rect x="105" y="50" width="180" height="110" rx="4" fill="#38bdf8" />
      <circle cx="160" cy="100" r="22" fill="#fde047" />
      <path d="M105 160 L170 110 L210 140 L245 115 L285 160 Z" fill="#22c55e" />
      <rect x="185" y="170" width="20" height="20" fill="#374151" />
      <rect x="20" y="130" width="40" height="95" rx="8" fill="#1f2937" />
      <rect x="330" y="130" width="40" height="95" rx="8" fill="#1f2937" />
    </g>

    <!-- 餐桌 -->
    <g v-else-if="scene === 'table'">
      <rect width="390" height="300" fill="#fef3c7" />
      <rect y="240" width="390" height="60" fill="#d6d3d1" />
      <circle cx="195" cy="50" r="20" fill="#fde68a" />
      <line x1="195" y1="0" x2="195" y2="32" stroke="#78716c" stroke-width="3" />
      <ellipse cx="195" cy="160" rx="160" ry="38" fill="#b45309" />
      <ellipse cx="195" cy="154" rx="160" ry="34" fill="#d97706" />
      <rect x="70" y="180" width="12" height="70" fill="#92400e" />
      <rect x="308" y="180" width="12" height="70" fill="#92400e" />
      <ellipse cx="140" cy="150" rx="26" ry="9" fill="#fff" />
      <ellipse cx="250" cy="150" rx="26" ry="9" fill="#fff" />
    </g>

    <!-- 廚房冰箱 -->
    <g v-else-if="scene === 'fridge'">
      <rect width="390" height="300" fill="#dcfce7" />
      <rect y="235" width="390" height="65" fill="#e7e5e4" />
      <rect x="0" y="125" width="130" height="110" fill="#d6d3d1" />
      <rect x="0" y="116" width="135" height="12" fill="#78716c" />
      <rect x="140" y="20" width="130" height="215" rx="16" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4" />
      <line x1="140" y1="98" x2="270" y2="98" stroke="#cbd5e1" stroke-width="4" />
      <rect x="250" y="44" width="8" height="36" rx="4" fill="#94a3b8" />
      <rect x="250" y="116" width="8" height="52" rx="4" fill="#94a3b8" />
      <rect x="290" y="125" width="100" height="110" fill="#d6d3d1" />
      <rect x="285" y="116" width="105" height="12" fill="#78716c" />
    </g>

    <!-- 浴室鏡子 -->
    <g v-else-if="scene === 'mirror'">
      <rect width="390" height="300" fill="#cffafe" />
      <path d="M0 0 H390 V300 H0 Z" fill="url(#tile)" opacity=".25" />
      <rect x="115" y="20" width="160" height="130" rx="65" fill="#e0f2fe" stroke="#94a3b8" stroke-width="8" />
      <path d="M150 60 L175 40" stroke="#fff" stroke-width="6" stroke-linecap="round" />
      <rect x="90" y="170" width="210" height="30" rx="8" fill="#f8fafc" stroke="#94a3b8" stroke-width="3" />
      <ellipse cx="195" cy="185" rx="50" ry="8" fill="#bae6fd" />
      <rect x="190" y="160" width="10" height="16" rx="3" fill="#94a3b8" />
      <rect x="110" y="200" width="170" height="100" fill="#e2e8f0" />
      <defs>
        <pattern id="tile" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="none" stroke="#0e7490" stroke-width="1" />
        </pattern>
      </defs>
    </g>

    <!-- 馬桶 -->
    <g v-else-if="scene === 'toilet'">
      <rect width="390" height="300" fill="#ecfeff" />
      <rect y="235" width="390" height="65" fill="#cbd5e1" />
      <rect x="150" y="50" width="90" height="80" rx="10" fill="#f8fafc" stroke="#94a3b8" stroke-width="4" />
      <rect x="225" y="62" width="10" height="6" rx="2" fill="#94a3b8" />
      <ellipse cx="195" cy="160" rx="70" ry="22" fill="#f8fafc" stroke="#94a3b8" stroke-width="4" />
      <ellipse cx="195" cy="158" rx="46" ry="12" fill="#bae6fd" />
      <path d="M140 170 Q150 230 195 235 Q240 230 250 170" fill="#f8fafc" stroke="#94a3b8" stroke-width="4" />
      <rect x="40" y="90" width="40" height="70" rx="6" fill="#fef9c3" stroke="#a16207" stroke-width="3" />
    </g>

    <!-- 臥室床 -->
    <g v-else-if="scene === 'bed'">
      <rect width="390" height="300" fill="#1e1b4b" />
      <circle cx="320" cy="60" r="26" fill="#fef9c3" />
      <circle cx="80" cy="40" r="2" fill="#fff" />
      <circle cx="140" cy="70" r="2" fill="#fff" />
      <circle cx="230" cy="30" r="2" fill="#fff" />
      <rect y="235" width="390" height="65" fill="#4c1d95" />
      <rect x="40" y="110" width="40" height="125" rx="6" fill="#92400e" />
      <rect x="40" y="165" width="310" height="55" rx="10" fill="#f9a8d4" />
      <rect x="40" y="150" width="310" height="30" rx="10" fill="#fbcfe8" />
      <rect x="90" y="130" width="70" height="30" rx="12" fill="#fff" />
      <rect x="40" y="215" width="310" height="14" rx="4" fill="#92400e" />
    </g>

    <!-- 書桌 -->
    <g v-else-if="scene === 'desk'">
      <rect width="390" height="300" fill="#fef9c3" />
      <rect y="250" width="390" height="50" fill="#d6d3d1" />
      <rect x="30" y="165" width="330" height="16" rx="4" fill="#92400e" />
      <rect x="45" y="181" width="14" height="90" fill="#78350f" />
      <rect x="331" y="181" width="14" height="90" fill="#78350f" />
      <rect x="130" y="80" width="130" height="80" rx="8" fill="#1f2937" />
      <rect x="138" y="88" width="114" height="62" rx="4" fill="#60a5fa" />
      <rect x="185" y="160" width="20" height="6" fill="#374151" />
      <path d="M70 165 L90 92 L110 165" fill="none" stroke="#374151" stroke-width="6" />
      <circle cx="90" cy="88" r="15" fill="#fbbf24" />
    </g>

    <!-- 通用房間（使用者自訂的位置） -->
    <g v-else>
      <rect width="390" height="300" fill="#f5f5f4" />
      <rect y="225" width="390" height="75" fill="#d6d3d1" />
      <rect x="40" y="40" width="80" height="100" rx="6" fill="#bae6fd" stroke="#fff" stroke-width="6" />
      <rect x="250" y="60" width="100" height="165" rx="6" fill="#a8a29e" />
      <circle cx="335" cy="145" r="5" fill="#fde68a" />
      <rect x="120" y="180" width="110" height="45" rx="8" fill="#78716c" />
    </g>
  </svg>
</template>

<style scoped>
.palace-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
</style>
