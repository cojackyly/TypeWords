<script setup lang="ts">
import PalaceScene from './PalaceScene.vue'
import {
  PALACE_SLOT_ANCHORS,
  type PalaceSceneKey,
  type PalaceSlotItem,
} from '@/core/composables/practice-words/practice-palace.ts'

// 記憶宮殿場景卡：位置插圖 + 疊在上面的單字圖（每格狀態見 PalaceSlotItem）
withDefaults(
  defineProps<{
    scene: PalaceSceneKey
    locusName: string
    locusIndex: number
    slots: (PalaceSlotItem | null)[]
    size?: 'large' | 'mini'
  }>(),
  { size: 'large' }
)
</script>

<template>
  <div class="scene-card" :class="size">
    <PalaceScene :scene="scene" />
    <div class="locus-label">{{ locusIndex + 1 }} {{ locusName }}</div>
    <template v-for="(item, i) in slots" :key="i">
      <div
        v-if="item"
        class="slot"
        :class="item.state"
        :style="{ left: PALACE_SLOT_ANCHORS[i]?.left + '%', top: PALACE_SLOT_ANCHORS[i]?.top + '%' }"
      >
        <div class="image" v-if="item.state === 'mystery'">❓</div>
        <div class="image" v-else-if="item.image">{{ item.image }}</div>
        <div class="image letter" v-else>{{ item.word.charAt(0).toUpperCase() }}</div>
        <!-- 回想中（blank）不顯示單字標籤，答案由下方輸入 -->
        <div class="tag" v-if="size === 'large' && (item.state === 'active' || item.state === 'dim')">
          {{ item.word }}
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.scene-card {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 1.2rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  aspect-ratio: 390 / 300;
  background: #f5f5f4;
  // 單字圖、標籤大小跟著卡片寬度縮放（cqw = 卡片寬度的 1%）
  container-type: inline-size;

  &.mini {
    border-radius: 0.75rem;
    box-shadow: none;

    .locus-label {
      font-size: 0.7rem;
      padding: 0 0.4rem;
      top: 0.3rem;
      left: 0.3rem;
    }

    .slot .image {
      font-size: 10cqw;
    }
  }
}

.locus-label {
  position: absolute;
  left: 0.7rem;
  top: 0.6rem;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 0.75rem;
  padding: 0.15rem 0.6rem;
  font-weight: 700;
  font-size: 0.95rem;
  color: #1f2937;
}

.slot {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: opacity 0.3s;

  .image {
    font-size: 11cqw;
    line-height: 1.1;
    white-space: nowrap;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25));

    &.letter {
      width: 16cqw;
      height: 16cqw;
      border-radius: 50%;
      background: #b45309;
      color: #fff;
      font-size: 8cqw;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .tag {
    margin-top: 0.1rem;
    background: #fff;
    border-radius: 0.6rem;
    padding: 0.05rem 0.5rem;
    font-family: var(--en-article-family);
    font-size: max(0.75rem, 4.2cqw);
    font-weight: 600;
    color: #1f2937;
    // 長單字不折行（例：document 被拆成 documen / t）
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

    &.blank {
      color: transparent;
      border-bottom: 3px solid #3b82f6;
      border-radius: 0.25rem;
      min-width: 5rem;
    }
  }

  &.active .image {
    animation: palace-pulse 1.4s ease-in-out infinite;
  }

  &.dim {
    opacity: 0.5;
  }

  &.mystery {
    opacity: 0.35;

    .image {
      font-size: 8cqw;
    }
  }
}

@keyframes palace-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .slot.active .image {
    animation: none;
  }
}
</style>
