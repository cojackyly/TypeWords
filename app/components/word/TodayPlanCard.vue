<script setup lang="ts">
// 首頁「今天」卡：一眼看到今天的進度、連續天數，按一個按鈕就開始。
// 分小組學：每日目標分成幾組，每組做完所有步驟才換下一組。
const props = defineProps<{
  /** 今天已經學完的新字數 */
  todayNew: number
  /** 每日新字目標 */
  dailyGoal: number
  /** 每組新字數 */
  groupSize: number
  /** 連續學習天數（含今天；今天還沒學時算到昨天） */
  streakDays: number
  /** 這次要複習的字數 */
  reviewCount: number
  /** 這次要學的新字數 */
  newCount: number
  /** 有上次沒做完的練習 */
  hasUnfinished: boolean
  loading?: boolean
}>()

const emit = defineEmits<{ start: [] }>()

const goalDone = $computed(() => props.todayNew >= props.dailyGoal)
const percent = $computed(() => Math.min(100, Math.round((props.todayNew / Math.max(1, props.dailyGoal)) * 100)))
const groupTotal = $computed(() => Math.max(1, Math.ceil(props.dailyGoal / Math.max(1, props.groupSize))))
const groupDone = $computed(() => Math.min(groupTotal, Math.floor(props.todayNew / Math.max(1, props.groupSize))))

const buttonText = $computed(() => {
  if (props.hasUnfinished) return '繼續上次的練習'
  if (props.reviewCount && props.newCount) return `先複習 ${props.reviewCount} 個，再學 ${props.newCount} 個新字`
  if (props.reviewCount) return `複習 ${props.reviewCount} 個字`
  if (props.newCount) return goalDone ? `再學一組：${props.newCount} 個新字` : `開始第 ${groupDone + 1} 組：${props.newCount} 個新字`
  return '開始練習'
})
</script>

<template>
  <div class="today-card">
    <div class="head">
      <div class="title">今天</div>
      <div class="streak" :class="{ off: !streakDays }">🔥 連續 {{ streakDays }} 天</div>
    </div>

    <div class="progress-row">
      <div class="nums">
        <b>{{ todayNew }}</b> / {{ dailyGoal }} 個新字
      </div>
      <div class="groups">{{ goalDone ? '今天的目標完成了 🎉' : `第 ${groupDone} / ${groupTotal} 組` }}</div>
    </div>
    <div class="bar"><div class="fill" :style="{ width: percent + '%' }"></div></div>

    <button class="start" :disabled="loading" @click="emit('start')">{{ buttonText }} →</button>
    <div class="hint" v-if="!hasUnfinished">每組 {{ groupSize }} 個新字，約 {{ groupSize }} 分鐘；到期的複習會先做</div>
  </div>
</template>

<style scoped lang="scss">
.today-card {
  background: var(--color-second);
  border-radius: 1rem;
  padding: 1rem 1.2rem;
  margin-bottom: 1rem;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    font-size: 1.3rem;
    font-weight: 700;
  }

  .streak {
    font-weight: 600;
    color: #d9480f;

    &.off {
      color: var(--color-font-3, #888);
    }
  }
}

.progress-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 0.6rem;

  .nums b {
    font-size: 1.8rem;
    color: #3b82f6;
  }

  .groups {
    color: var(--color-font-3, #888);
  }
}

.bar {
  height: 0.5rem;
  border-radius: 0.25rem;
  background: var(--color-item-border);
  margin-top: 0.3rem;
  overflow: hidden;

  .fill {
    height: 100%;
    background: #3b82f6;
    border-radius: 0.25rem;
    transition: width 0.3s;
  }
}

.start {
  width: 100%;
  min-height: 3.2rem;
  margin-top: 0.9rem;
  border: none;
  border-radius: 0.75rem;
  background: #facc15;
  color: #111;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
  }
}

.hint {
  font-size: 0.85rem;
  color: var(--color-font-3, #888);
  text-align: center;
  margin-top: 0.4rem;
}
</style>
