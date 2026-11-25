<script setup lang="ts">
import { useSettingStore } from '@/core/stores/setting.ts'
import { useBaseStore } from '@/core/stores/base.ts'
import {
  getLocusScene,
  getPalaceKey,
  getWordImage,
  getShortMeaning,
  getWordPicture,
  WORDS_PER_LOCUS,
  type PalaceSlotItem,
} from '@/core/composables/practice-words/practice-palace.ts'
import PalaceSceneCard from '@/components/word/PalaceSceneCard.vue'
import type { Word } from '@/core/types/types.ts'
import { useTTsPlayAudio } from '@/core/hooks/sound.ts'
import { BasePage } from '@/base'

// 記憶宮殿總覽：顯示最近一次放置的單字在路線上的位置
const settingStore = useSettingStore()
const store = useBaseStore()
const ttsPlay = useTTsPlayAudio()

// 排除空白 key（舊版本的錯誤資料）
const entries = $computed(() => Object.entries(settingStore.palaceAssignments ?? {}).filter(([key]) => key))
const batches = $computed(() => [...new Set(entries.map(([, a]) => a.batch))].sort().reverse())
let batchIndex = $ref(0)
const batch = $computed(() => batches[batchIndex])

// 目前詞典的單字資料（查中文與口訣用）
const wordMap = $computed(() => {
  const map = new Map<string, Word>()
  for (const w of store.sdict.words ?? []) map.set(getPalaceKey(w), w)
  return map
})

/** 依宮殿 → 位置分組，每個位置最多 WORDS_PER_LOCUS 個字 */
const groups = $computed(() => {
  const list = entries.filter(([, a]) => a.batch === batch)
  return settingStore.palaces
    .map(palace => ({
      palace,
      loci: palace.loci.map((name, locus) => ({
        name,
        locus,
        words: list
          .filter(([, a]) => a.palaceId === palace.id && a.locus === locus)
          .sort((x, y) => x[1].slot - y[1].slot)
          .map(([key, a]) => ({ word: wordMap.get(key) ?? ({ word: key, trans: [] } as unknown as Word), slot: a.slot })),
      }))
      .map(l => ({
        ...l,
        scene: getLocusScene(palace, l.locus),
        slots: Array.from({ length: WORDS_PER_LOCUS }, (_, slot): PalaceSlotItem | null => {
          const hit = l.words.find(x => x.slot === slot)
          return hit ? { image: getWordImage(hit.word), word: hit.word.word, meaning: getShortMeaning(hit.word), picture: getWordPicture(hit.word), state: 'active' } : null
        }),
      })),
    }))
    .filter(g => g.loci.some(l => l.words.length))
})

let selected = $ref<Word | null>(null)

function select(word: Word) {
  selected = selected?.word === word.word ? null : word
  ttsPlay(word.word)
}

const batchLabel = (b?: string) => (b ? b.split('|')[0] : '')
</script>

<template>
  <BasePage>
    <div class="card palace-overview">
      <button class="back" @click="$router.back()">‹ {{ $t('back') }}</button>
      <div class="head">
        <button class="nav" :disabled="batchIndex >= batches.length - 1" @click="batchIndex++">‹</button>
        <div class="title">🏠 {{ $t('palace_overview') }} · {{ batchLabel(batch) }}</div>
        <button class="nav" :disabled="batchIndex <= 0" @click="batchIndex--">›</button>
      </div>

      <div class="empty" v-if="!groups.length">{{ $t('palace_overview_empty') }}</div>

      <div v-for="g in groups" :key="g.palace.id" class="palace-block">
        <div class="palace-title">{{ g.palace.icon }} {{ g.palace.name }}</div>
        <div class="map">
          <div v-for="l in g.loci" :key="l.locus" class="cell" :class="{ blank: !l.words.length }">
            <PalaceSceneCard size="mini" :scene="l.scene" :locus-name="l.name" :locus-index="l.locus" :slots="l.slots" />
            <div class="ws">
              <span v-for="x in l.words" :key="x.word.word" class="w" @click="select(x.word)">{{ x.word.word }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="detail" v-if="selected">
        <div class="dw">{{ selected.word }}</div>
        <div v-for="(t, i) in (selected.trans ?? []).slice(0, 2)" :key="i">{{ t.pos }} {{ t.cn }}</div>
      </div>
    </div>
  </BasePage>
</template>

<style scoped lang="scss">
.palace-overview {
  .back {
    background: none;
    border: none;
    color: var(--color-select-bg, #3b82f6);
    font-size: 1rem;
    padding: 0 0 0.6rem;
    cursor: pointer;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .title {
      flex: 1;
      text-align: center;
      font-weight: 700;
      font-size: 1.1rem;
    }

    .nav {
      width: 2.2rem;
      height: 2.2rem;
      border-radius: 1.1rem;
      border: 1px solid var(--color-item-border);
      background: var(--color-second);
      color: var(--color-main-text);
      font-size: 1.1rem;
      cursor: pointer;

      &:disabled {
        opacity: 0.3;
      }
    }
  }

  .empty {
    text-align: center;
    color: var(--color-font-3, #888);
    padding: 2rem 0;
  }

  .palace-title {
    font-weight: 600;
    margin-top: 1rem;
  }

  .map {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .cell {
    background: var(--color-second);
    border-radius: 0.75rem;
    padding: 0.3rem;

    &.blank {
      opacity: 0.5;
    }

    .ln {
      font-size: 0.75rem;
      font-weight: 700;
      color: #b45309;
    }

    .ws {
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      margin-top: 0.2rem;
      min-height: 1.6rem;
    }

    .w {
      font-family: var(--en-article-family);
      font-size: 1rem;
      line-height: 1.6;
      cursor: pointer;

      &.none {
        color: var(--color-font-3, #aaa);
        cursor: default;
      }
    }
  }

  .detail {
    position: sticky;
    bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
    margin-top: 1rem;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 0.75rem;
    padding: 0.8rem;
    color: #1f2937;
    font-size: 0.9rem;
    line-height: 1.6;

    .dw {
      font-family: var(--en-article-family);
      font-size: 1.3rem;
      font-weight: 600;
    }

    .mn {
      margin-top: 0.4rem;
    }
  }
}
</style>
