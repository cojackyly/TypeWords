<script setup lang="ts">
import { watch } from 'vue'
import type { Word } from '@/core/types/types.ts'

// 選擇題：看中文（和圖），點選正確的英文。手機上不用打字。
// 答錯：標紅、算一次錯，正確答案標綠，點正確答案才進下一個（看過正確答案再走）。
const props = defineProps<{
  word: Word
  /** 短中文意思 */
  meaning: string
  /** 意思插圖網址；沒有時顯示 emoji */
  picture?: string
  emoji?: string
  /** 英文選項（已含正確答案、已洗牌） */
  options: string[]
}>()

const emit = defineEmits<{
  complete: []
  wrong: []
  play: []
}>()

// 答對後停一下再換下一個，讓使用者看到綠色的回饋
const NEXT_DELAY_MS = 500

let wrongPicks = $ref<string[]>([])
let done = $ref(false)

watch(
  () => props.word.word,
  () => {
    wrongPicks = []
    done = false
  }
)

function pick(option: string) {
  if (done || wrongPicks.includes(option)) return
  if (option === props.word.word) {
    done = true
    emit('play')
    setTimeout(() => emit('complete'), NEXT_DELAY_MS)
    return
  }
  // 同一題只算一次錯
  if (!wrongPicks.length) emit('wrong')
  wrongPicks = [...wrongPicks, option]
}

function stateOf(option: string) {
  if (option === props.word.word && (done || wrongPicks.length)) return 'right'
  if (wrongPicks.includes(option)) return 'wrong'
  return ''
}
</script>

<template>
  <div class="word-choice" data-no-refocus>
    <div class="question">
      <img v-if="picture" class="picture" :src="picture" :alt="meaning" draggable="false" />
      <div v-else-if="emoji" class="emoji">{{ emoji }}</div>
      <div class="meaning">
        <span class="pos" v-if="word.trans?.[0]?.pos">{{ word.trans[0].pos }}</span>
        {{ meaning }}
      </div>
      <div class="tip">{{ wrongPicks.length && !done ? '答錯了，點綠色的正確答案繼續' : '選出正確的英文' }}</div>
    </div>

    <div class="options">
      <button v-for="option in options" :key="option" class="option" :class="stateOf(option)" @click="pick(option)">
        {{ option }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.word-choice {
  width: 100%;
  max-width: 36rem;
  margin-top: 1rem;
  text-align: center;
}

.question {
  background: var(--color-second);
  border-radius: 1rem;
  padding: 1rem;

  .picture {
    width: 9rem;
    height: 9rem;
    object-fit: cover;
    border-radius: 0.75rem;
    background: #fff;
  }

  .emoji {
    font-size: 3.5rem;
    line-height: 1.2;
  }

  .meaning {
    font-size: 1.6rem;
    font-weight: 700;
    margin-top: 0.4rem;

    .pos {
      font-size: 1rem;
      font-weight: 400;
      color: var(--color-select-bg, #3b82f6);
    }
  }

  .tip {
    font-size: 0.9rem;
    color: var(--color-font-3, #888);
    margin-top: 0.3rem;
  }
}

.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin-top: 0.8rem;
}

.option {
  min-height: 3.6rem;
  padding: 0.4rem 0.6rem;
  border-radius: 0.75rem;
  border: 2px solid var(--color-item-border);
  background: var(--color-second);
  color: var(--color-main-text);
  font-family: var(--en-article-family);
  font-size: 1.15rem;
  // 長單字不超出按鈕
  overflow-wrap: anywhere;
  cursor: pointer;

  &.right {
    border-color: rgb(22, 163, 74);
    background: rgba(22, 163, 74, 0.15);
  }

  &.wrong {
    border-color: rgb(220, 38, 38);
    background: rgba(220, 38, 38, 0.12);
    opacity: 0.6;
  }
}
</style>
