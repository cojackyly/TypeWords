<script setup lang="ts">
import type { Dict } from '@/core/types'
import { Checkbox, Progress } from '@/base'
import { withAppBaseURL } from '@/core/utils/base-url'
import { isMobile } from '@/core/utils'
import { useI18n } from 'vue-i18n'

interface IProps {
  item?: Partial<Dict>
  quantifier?: string
  isAdd: boolean
  showCheckbox?: boolean
  checked?: boolean
  selected?: boolean
  showProgress?: boolean
  isUser?: boolean //是否是用户的词典
}

const props = withDefaults(defineProps<IProps>(), {
  showProgress: true,
  isUser: false,
})

const emit = defineEmits<{
  check: []
  click: []
}>()

const progress = $computed(() => {
  return Number(((props.item?.lastLearnIndex / props.item?.length) * 100).toFixed())
})

const studyProgress = $computed(() => {
  if (!props.showProgress) return
  return props.item?.lastLearnIndex ? props.item?.lastLearnIndex + '/' : ''
})

const coverSrc = $computed(() => {
  return props.item?.cover ? withAppBaseURL(props.item.cover) : ''
})

// 呼叫端傳的是寫死的簡體量詞，這裡轉成多語系
const QUANTIFIER_I18N_KEY: Record<string, string> = { 词: 'word_unit', 篇: 'article_unit' }
const { t: i18nT } = useI18n()
const quantifierText = $computed(() => {
  const key = props.quantifier ? QUANTIFIER_I18N_KEY[props.quantifier] : ''
  return key ? i18nT(key) : (props.quantifier ?? '')
})

// 手機：書本比例的卡片太高，改成清單列
const isMob = isMobile()

function handleClick(e: MouseEvent) {
  if (props.showCheckbox) {
    e.stopPropagation()
    emit('check')
  } else {
    emit('click')
  }
}
</script>

<template>
  <!-- 手機版：清單列 -->
  <div
    v-if="isMob && !isAdd"
    class="book-row"
    :class="(selected || checked) && 'book-selected'"
    :id="`dict-${item?.id}`"
    @click="handleClick"
  >
    <Checkbox v-if="showCheckbox" :model-value="checked" @change="$emit('check')" />
    <div class="book-row-name">{{ item?.name }}</div>
    <span class="book-row-tag" v-if="item?.custom">{{ $t('custom') }}</span>
    <span class="book-row-tag" v-else-if="item?.system">{{ $t('builtin') }}</span>
    <Progress
      v-if="item?.lastLearnIndex && showProgress"
      class="book-row-progress"
      :percentage="progress"
      :show-text="false"
    ></Progress>
    <span class="book-row-count">{{ studyProgress }}{{ item?.length }}{{ quantifierText }}</span>
  </div>
  <div v-else-if="isMob && isAdd" class="book-row book-row-add" id="no-book" @click="handleClick">
    <IconFluentAdd16Regular />
  </div>
  <div style="width: var(--book-width)" :id="`dict-${item?.id}`" v-else-if="!isAdd" @click="handleClick">
    <div
      class="book overflow-hidden relative"
      :class="[showCheckbox && 'book-selectable', (selected || checked) && 'book-selected']"
    >
      <img class="absolute top-0 left-0 w-full object-cover" v-if="item?.cover" :src="coverSrc" alt="" />
      <div class="text-base mt-1" v-else>{{ item?.name }}</div>
      <div class="absolute bottom-4 right-3 z-1" v-if="!item?.cover">
        <div>{{ studyProgress }}{{ item?.length }}{{ quantifierText }}</div>
      </div>
      <div class="absolute bottom-2 left-3 right-3">
        <Progress
          v-if="item?.lastLearnIndex && showProgress"
          class="mt-1"
          :percentage="progress"
          :show-text="false"
        ></Progress>
      </div>
      <Checkbox
        v-if="showCheckbox"
        :model-value="checked"
        @change="$emit('check')"
        class="absolute left-2 bottom-3 z-3"
      />
      <div class="custom z-1" v-if="item.custom">{{ $t('custom') }}</div>
      <div class="system z-1" v-else-if="item.system"> {{ $t('builtin') }}</div>
      <!--      <div class="custom bg-red! color-white z-1" v-else-if="item.update">更新中</div>-->
      <!--      <div class="sync bg-red! color-white z-1" v-if="!item.sync && isUser && !showCheckbox">未同步</div>-->
    </div>
    <div class="flex justify-between text-base mt-1" v-if="item?.cover">
      <div class="w-6/10 truncate">{{ item?.name }}</div>
      <div>{{ studyProgress }}{{ item?.length }}{{ quantifierText }}</div>
    </div>
  </div>
  <div v-else class="book" id="no-book" @click="handleClick">
    <div class="h-full center text-2xl">
      <IconFluentAdd16Regular />
    </div>
  </div>
</template>

<style scoped lang="scss">
.book-selectable {
  &:hover {
    border-color: var(--color-input-border);
  }
}

.book-selected {
  @apply bg-fifth;
  border-color: var(--color-select-bg) !important;
}

.custom {
  position: absolute;
  top: 4px;
  right: -22px;
  padding: 1px 20px;
  background: #409eff;
  color: white;
  font-size: 11px;
  transform: rotate(45deg);
}

.system {
  position: absolute;
  left: 10px;
  bottom: 18px;
  border-radius: 8px;
  padding: 2px 8px;
  // background: var(--color-link);
  background: #409eff;
  color: white;
  font-size: 11px;
}

.sync {
  @extend .custom;
  bottom: 4px;
  left: -22px;
  top: unset;
  right: unset;
}

.book-row {
  @apply rounded-md cursor-pointer;
  width: 100%;
  min-height: 3.5rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0.9rem;
  box-sizing: border-box;
  background: var(--bg-book);
  border: 1px solid var(--book-border);

  .book-row-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .book-row-tag {
    font-size: 11px;
    padding: 1px 8px;
    border-radius: 8px;
    background: #409eff;
    color: #fff;
    flex-shrink: 0;
  }

  .book-row-progress {
    width: 4.5rem;
    flex-shrink: 0;
  }

  .book-row-count {
    font-size: 0.85rem;
    color: var(--color-font-3, #888);
    flex-shrink: 0;
  }

  &.book-row-add {
    justify-content: center;
    font-size: 1.3rem;
  }
}
</style>
