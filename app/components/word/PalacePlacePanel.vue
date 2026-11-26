<script setup lang="ts">
import type { Word } from '@/core/types/types.ts'
import PalaceSceneCard from './PalaceSceneCard.vue'
import PalaceRouteMap from './PalaceRouteMap.vue'
import { getKKPhonetic } from '@/core/utils/phonetic.ts'
import type { PalaceSceneKey, PalaceSlotItem } from '@/core/composables/practice-words/practice-palace.ts'

// 記憶宮殿「放置」：單字圖住進位置場景，只看和想像，不打字
defineProps<{
  word: Word
  scene: PalaceSceneKey
  locusName: string
  locusIndex: number
  /** 整條路線的位置數，給路線地圖用 */
  routeCount: number
  slots: (PalaceSlotItem | null)[]
}>()

const emit = defineEmits<{
  next: []
  play: []
}>()
</script>

<template>
  <div class="palace-place" data-no-refocus>
    <PalaceRouteMap :count="routeCount" :current="locusIndex" />

    <!-- 換位置時像走過去一樣滑動；同一個位置的第 2 個字不滑動（key 不變） -->
    <Transition name="palace-walk" mode="out-in">
      <PalaceSceneCard
        class="mt-2"
        :key="locusIndex"
        :scene="scene"
        :locus-name="locusName"
        :locus-index="locusIndex"
        :slots="slots"
      />
    </Transition>

    <div class="word-card">
      <div class="w">{{ word.word }}</div>
      <div class="ph" @click="emit('play')">
        {{ getKKPhonetic(word) ? `[${getKKPhonetic(word)}]` : '' }} 🔊
      </div>
      <div class="tr" v-if="word.trans[0]">
        <span class="pos">{{ word.trans[0].pos }}</span> {{ word.trans[0].cn }}
      </div>
    </div>

    <div class="actions">
      <button class="btn-o" @click="emit('play')">🔊 發音</button>
      <button class="btn-y" @click="emit('next')">下一個 →</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
$gold: #b45309;

.palace-place {
  width: 100%;
  max-width: 36rem;
  margin-top: 1rem;
  text-align: center;
}

.word-card {
  background: var(--color-second);
  border-radius: 1rem;
  padding: 0.8rem 1rem;
  margin-top: 0.8rem;

  .w {
    font-family: var(--en-article-family);
    font-size: 2rem;
    letter-spacing: 0.1rem;
  }

  .ph {
    color: var(--color-font-3, #888);
    font-size: 0.9rem;
    cursor: pointer;
  }

  .tr {
    font-size: 0.95rem;
    margin-top: 0.2rem;
    // 翻譯很長時最多 2 行，下面的按鈕才不會被推出畫面
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;

    .pos {
      color: var(--color-select-bg, #3b82f6);
    }
  }
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.8rem;

  button {
    flex: 1;
    height: 3rem;
    border-radius: 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-o {
    background: var(--color-second);
    border: 1px solid var(--color-item-border);
    color: var(--color-main-text);
  }

  .btn-y {
    background: #facc15;
    border: none;
    color: #111;
  }
}
</style>
