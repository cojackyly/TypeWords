<script setup lang="ts">
// 記憶宮殿路線地圖：把所有位置連成一條路，看得到整條路線、走過哪些、現在在哪裡。
// 記憶宮殿靠「沿著路線走」來回想，所以路線本身要一直看得到，不能只是一排小點。
const props = defineProps<{
  /** 路線上的位置數 */
  count: number
  /** 目前的位置（0 起算） */
  current: number
  /** 精簡版：全部排成一排、站點縮小。回想步驟鍵盤打開時畫面很擠，用這個 */
  compact?: boolean
}>()

const VIEW_WIDTH = 360
const ROW_HEIGHT = 46
const PADDING_X = 26
const PADDING_Y = 24
const COMPACT_PADDING_Y = 18
// 站點半徑：[一般站, 目前站]；精簡版一排要放下全部站點，所以縮小
const STOP_RADIUS = { normal: [13, 17], compact: [10, 13] } as const
// 位置多於這個數量就折成兩排（蛇形：第一排左到右，第二排右到左，路線才連得起來）
const SINGLE_ROW_MAX = 6

const layout = $computed(() => {
  const count = props.count
  const perRow = !props.compact && count > SINGLE_ROW_MAX ? Math.ceil(count / 2) : Math.max(1, count)
  const rows = Math.ceil(count / perRow)
  const paddingY = props.compact ? COMPACT_PADDING_Y : PADDING_Y
  const step = perRow > 1 ? (VIEW_WIDTH - PADDING_X * 2) / (perRow - 1) : 0
  // 站點只標編號：背景跟著單字的場景走，位置本身不再對應固定的家具
  const stops = Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow)
    const col = i % perRow
    // 第二排反向排列，讓上一排的最後一站接到下一排的第一站
    const x = perRow > 1 ? PADDING_X + (row % 2 === 0 ? col : perRow - 1 - col) * step : VIEW_WIDTH / 2
    const y = paddingY + row * ROW_HEIGHT
    return { x, y, index: i }
  })
  const pathOf = (list: typeof stops) => list.map((s, i) => `${i ? 'L' : 'M'}${s.x} ${s.y}`).join(' ')
  return {
    height: paddingY * 2 + (rows - 1) * ROW_HEIGHT,
    stops,
    fullPath: pathOf(stops),
    // 走過的路段：從起點到目前位置
    walkedPath: pathOf(stops.slice(0, Math.min(count, props.current + 1))),
  }
})

const radius = $computed(() => STOP_RADIUS[props.compact ? 'compact' : 'normal'])
const stateOf = (index: number) => (index < props.current ? 'done' : index === props.current ? 'on' : '')
</script>

<template>
  <svg
    class="palace-route-map"
    :class="{ compact }"
    :viewBox="`0 0 ${VIEW_WIDTH} ${layout.height}`"
    role="img"
    :aria-label="`路線共 ${count} 個位置，現在在第 ${current + 1} 個`"
  >
    <path class="path" :d="layout.fullPath" />
    <path class="path walked" :d="layout.walkedPath" />
    <g v-for="stop in layout.stops" :key="stop.index" class="stop" :class="stateOf(stop.index)">
      <circle :cx="stop.x" :cy="stop.y" :r="radius[stateOf(stop.index) === 'on' ? 1 : 0]" />
      <text :x="stop.x" :y="stop.y" class="icon">{{ stop.index + 1 }}</text>
    </g>
  </svg>
</template>

<style scoped lang="scss">
$gold: #b45309;

.palace-route-map {
  display: block;
  width: 100%;
  max-width: 26rem;
  margin: 0 auto;
}

.path {
  fill: none;
  stroke: var(--color-item-border);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 2 7;

  &.walked {
    stroke: #fbbf24;
    stroke-dasharray: none;
  }
}

.stop {
  circle {
    fill: var(--color-second);
    stroke: var(--color-item-border);
    stroke-width: 2;
    transition: r 0.3s;
  }

  // 站點編號
  .icon {
    font-size: 12px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
    fill: var(--color-font-3, #888);
  }

  &.done {
    circle {
      fill: #fef3c7;
      stroke: #fbbf24;
    }

    .icon {
      fill: $gold;
    }
  }

  .compact & .icon {
    font-size: 10px;
  }

  .compact &.on .icon {
    font-size: 13px;
  }

  &.on {
    circle {
      fill: #fff;
      stroke: $gold;
      stroke-width: 3;
    }

    .icon {
      font-size: 15px;
      fill: $gold;
    }
  }
}
</style>
