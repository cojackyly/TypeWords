<script setup lang="ts">
import PalaceScene from './PalaceScene.vue'
import {
  PALACE_SCENE_SLOTS,
  type PalaceSceneKey,
  type PalaceSlotItem,
} from '@/core/composables/practice-words/practice-palace.ts'

// 記憶宮殿場景卡：位置插圖 + 疊在上面的單字圖（每格狀態見 PalaceSlotItem）
// 大卡片上目前的字（active）會用動作進場、撞到場景物件，場景跟著震一下
const props = withDefaults(
  defineProps<{
    scene: PalaceSceneKey
    locusName: string
    locusIndex: number
    slots: (PalaceSlotItem | null)[]
    size?: 'large' | 'mini'
  }>(),
  { size: 'large' }
)

const slotSpecs = $computed(() => PALACE_SCENE_SLOTS[props.scene] ?? PALACE_SCENE_SLOTS.room)
/** 換字時用來重播動畫（key 改變 → 元素重建 → 動畫從頭跑） */
const activeWord = $computed(() => (props.size === 'large' ? props.slots.find(s => s?.state === 'active')?.word ?? '' : ''))
</script>

<template>
  <div class="scene-card" :class="size">
    <div class="scene-wrap" :class="{ impact: !!activeWord }" :key="activeWord">
      <PalaceScene :scene="scene" />
    </div>
    <div class="locus-label">{{ locusIndex + 1 }} {{ locusName }}</div>
    <template v-for="(item, i) in slots" :key="i + (item?.word ?? '') + (item?.state ?? '')">
      <div
        v-if="item"
        class="slot"
        :class="item.state"
        :style="{ left: slotSpecs[i]?.left + '%', top: slotSpecs[i]?.top + '%' }"
      >
        <div class="image" :class="size === 'large' && item.state === 'active' ? `act-${slotSpecs[i]?.action}` : ''">
          <template v-if="item.state === 'mystery'">❓</template>
          <!-- 有意思插圖就用插圖，沒有才用 Emoji -->
          <img v-else-if="item.picture" class="picture" :src="item.picture" :alt="item.meaning" draggable="false" />
          <template v-else-if="item.image">{{ item.image }}</template>
          <span class="letter" v-else>{{ item.word.charAt(0).toUpperCase() }}</span>
        </div>
        <!-- 標籤：先中文、再英文。回想中（blank）只顯示中文，英文留空，由下方輸入 -->
        <div class="tag" v-if="size === 'large' && item.state !== 'mystery'">
          <div class="meaning" v-if="item.meaning">{{ item.meaning }}</div>
          <div class="en" :class="{ blank: item.state === 'blank' }">{{ item.state === 'blank' ? '' : item.word }}</div>
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

// 走路轉場：換位置時，舊場景往左滑出、新場景從右滑入（由外層的 <Transition name="palace-walk"> 觸發）
.scene-card.palace-walk-enter-active,
.scene-card.palace-walk-leave-active {
  transition:
    transform 0.28s ease,
    opacity 0.28s ease;
}

.scene-card.palace-walk-enter-from {
  transform: translateX(45%);
  opacity: 0;
}

.scene-card.palace-walk-leave-to {
  transform: translateX(-45%);
  opacity: 0;
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

.scene-wrap {
  position: absolute;
  inset: 0;

  // 單字圖撞到場景物件的瞬間（約 0.45 秒），整個場景震一下
  &.impact {
    animation: palace-impact 0.3s 0.45s ease-out;
  }
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

    // 意思插圖：目前的字（active）和回想中的字（blank）放大，其他格縮小
    .picture {
      display: block;
      width: 15cqw;
      height: 15cqw;
      object-fit: cover;
      border-radius: 1.5cqw;
      border: 0.6cqw solid #fff;
      background: #fff;
    }

    .letter {
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
    padding: 0.1rem 0.55rem 0.15rem;
    color: #1f2937;
    text-align: center;
    line-height: 1.25;
    // 長單字不折行（例：document 被拆成 documen / t）
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

    .meaning {
      font-size: max(0.8rem, 4.6cqw);
      font-weight: 700;
      color: #b45309;
    }

    .en {
      font-family: var(--en-article-family);
      font-size: max(0.75rem, 4.2cqw);
      font-weight: 600;

      // 回想：英文的位置留一條底線
      &.blank {
        width: 12cqw;
        height: max(0.75rem, 4.2cqw);
        margin: 0 auto;
        border-bottom: 2px solid #3b82f6;
      }
    }
  }

  // 標籤等圖進場後才出現，先看圖、再看字
  &.active .tag {
    animation: palace-tag-in 0.3s 0.7s both;
  }

  &.active .picture,
  &.blank .picture {
    width: 26cqw;
    height: 26cqw;
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

// 進場動作：先跑一次動作（0.8 秒），之後輕輕跳動，提醒「這是現在的字」
$pulse: palace-pulse 1.4s 0.9s ease-in-out infinite;

.act-crash {
  animation: palace-crash 0.8s ease-out, $pulse;
}
.act-drop {
  animation: palace-drop 0.8s ease-in, $pulse;
}
.act-pop {
  animation: palace-pop 0.8s ease-out, $pulse;
}
.act-zoom {
  animation: palace-zoom 0.8s ease-out, $pulse;
}
.act-bounce {
  animation: palace-bounce 0.9s ease-out, $pulse;
}
.act-swing {
  transform-origin: 50% -40%;
  animation: palace-swing 2.4s ease-in-out infinite;
}
.act-float {
  animation: palace-float-in 0.8s ease-out, palace-float 2.4s 0.8s ease-in-out infinite;
}
.act-shiver {
  animation: palace-zoom 0.6s ease-out, palace-shiver 0.5s 0.6s linear infinite;
}

@keyframes palace-crash {
  0% {
    transform: translateX(-160%) rotate(-25deg);
    opacity: 0;
  }
  55% {
    transform: translateX(8%) rotate(8deg);
    opacity: 1;
  }
  70% {
    transform: translateX(-6%) rotate(-5deg);
  }
  85% {
    transform: translateX(3%) rotate(2deg);
  }
  100% {
    transform: none;
  }
}

@keyframes palace-drop {
  0% {
    transform: translateY(-180%);
    opacity: 0;
  }
  55% {
    transform: translateY(0) scale(1.15, 0.8);
    opacity: 1;
  }
  75% {
    transform: translateY(-18%) scale(0.95, 1.05);
  }
  100% {
    transform: none;
  }
}

@keyframes palace-pop {
  0% {
    transform: translateY(70%) scale(0.2);
    opacity: 0;
  }
  55% {
    transform: translateY(-25%) scale(1.25);
    opacity: 1;
  }
  100% {
    transform: none;
  }
}

@keyframes palace-zoom {
  0% {
    transform: scale(0.15) rotate(-10deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.3) rotate(4deg);
    opacity: 1;
  }
  100% {
    transform: none;
  }
}

@keyframes palace-bounce {
  0% {
    transform: translateY(-120%);
    opacity: 0;
  }
  35% {
    transform: translateY(0);
    opacity: 1;
  }
  55% {
    transform: translateY(-40%);
  }
  75% {
    transform: translateY(0);
  }
  88% {
    transform: translateY(-12%);
  }
  100% {
    transform: none;
  }
}

@keyframes palace-swing {
  0%,
  100% {
    transform: rotate(-14deg);
  }
  50% {
    transform: rotate(14deg);
  }
}

@keyframes palace-float-in {
  0% {
    transform: translateY(60%);
    opacity: 0;
  }
  100% {
    transform: none;
    opacity: 1;
  }
}

@keyframes palace-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10%);
  }
}

@keyframes palace-shiver {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-3%);
  }
  75% {
    transform: translateX(3%);
  }
}

@keyframes palace-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes palace-impact {
  0%,
  100% {
    transform: none;
  }
  25% {
    transform: translate(-1.5%, 1%);
  }
  50% {
    transform: translate(1.5%, -1%);
  }
  75% {
    transform: translate(-0.8%, 0.5%);
  }
}

@keyframes palace-tag-in {
  from {
    opacity: 0;
    transform: translateY(-30%);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .slot .image,
  .slot .tag,
  .scene-wrap {
    animation: none !important;
  }

  .scene-card.palace-walk-enter-active,
  .scene-card.palace-walk-leave-active {
    transition: none;
  }
}
</style>
