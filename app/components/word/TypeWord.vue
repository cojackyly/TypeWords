<script setup lang="ts">
/**
 * 单词练习外壳组件
 * 此组件负责：
 * - 布局容器编排（组合 WordTypingCore / WordIdentifyPanel / WordMetaPanel）
 * - effective 显示策略计算
 * - 笔记 / 收藏 / 操作按钮
 * - 提示 Toast（按空格 / 按删除）
 * - defineExpose 透传
 *
 * 子组件：
 * - WordTypingCore：纯键入引擎
 * - WordIdentifyPanel：自测 / WordTest UI
 * - WordMetaPanel：音标 / 翻译 / 例句 / 短语 / 词源
 */
import type { Question, Word } from '@/core/types/types.ts'
import { getDefaultWord } from '@/core/types/func.ts'
import { ShortcutKey, WordPlayTrigger, WordPracticeType } from '@/core/types/enum.ts'
import { useBaseStore } from '@/core/stores/base.ts'
import { useSettingStore } from '@/core/stores/setting.ts'
import { usePlayWordAudio } from '@/core/hooks/sound.ts'
import { useInjectedDisplayPolicy } from '@/core/composables/practice-words/usePracticeDisplayPolicy.ts'
import { EventKey, useEvents } from '@/core/utils/eventBus.ts'
import { computed, inject, ref, watch } from 'vue'
import WordLookupPopover from '@/components/word/WordLookupPopover.vue'
import { BaseButton, BaseIcon, Textarea, Toast, ToastComponent, Tooltip, VolumeIcon } from '@/base'
import { useI18n } from 'vue-i18n'
import { useWordOptions } from '@/core/hooks/dict.ts'
import { openWordCollectPicker } from '@/core/hooks/useWordCollectPicker.ts'
import WordTypingCore from './WordTypingCore.vue'
import WordIdentifyPanel from './WordIdentifyPanel.vue'
import WordMetaPanel from './WordMetaPanel.vue'
import { useOnKeyboardEventListener } from '@/core/hooks/event.ts'
import { _nextTick, throttle } from '@/core'
import { usePracticeTypeWordController } from '@/core/composables/practice-words/usePracticeTypeWordController.ts'
import { useMobileKeyboard } from '@/core/hooks/mobileKeyboard.ts'
import { vibrateOnTypo } from '@/core/hooks/haptics.ts'
import { usePracticeStore } from '@/core/stores/practice.ts'
import { isMobile } from '@/core/utils'
import { findClozeSentences } from '@/core/composables/practice-words/practice-cloze.ts'
import { isWholeWordJudgeType } from '@/core/composables/practice-words/practice-type.ts'
import { useTTsPlayAudio } from '@/core/hooks/sound.ts'
import PalacePlacePanel from './PalacePlacePanel.vue'
import PalaceSceneCard from './PalaceSceneCard.vue'
import {
  assignByOrder,
  getLocusScene,
  getWordImage,
  type PalaceSlotItem,
  getPalaceKey,
  makePalaceBatch,
  WORDS_PER_LOCUS,
} from '@/core/composables/practice-words/practice-palace.ts'
import type { PracticeData } from '@/core/composables/practice-words/practice-word-session.ts'

const { t: $t } = useI18n()

interface IProps {
  word: Word
  question?: Question | null
  /** 当前 Cursor 解析出的真实练习类型。 */
  practiceType: WordPracticeType
  /** 当前练习阶段标识，用于重置“显示单词”计错状态。 */
  phaseKey: string
}

const props = withDefaults(defineProps<IProps>(), {
  word: () => getDefaultWord(),
})

const emit = defineEmits<{
  complete: []
  wrong: [source?: 'identifyTyping']
  know: []
  mastered: []
  skip: []
  toggleSimple: []
  quickMark: []
}>()

const settingStore = useSettingStore()
const store = useBaseStore()
const statStore = usePracticeStore()

// ============ 手機版：鍵盤打開 = 打字模式；鍵盤收起 = 看詳情模式 ============
const isMob = isMobile()
const mobileKeyboard = useMobileKeyboard()
const mobileDetail = computed(
  () =>
    isMob &&
    !mobileKeyboard.isOpen.value &&
    props.practiceType !== WordPracticeType.Identify &&
    props.practiceType !== WordPracticeType.PalacePlace
)

function enterMobileDetail() {
  if (!statStore.timerPaused) statStore.pauseTimer('manual')
  mobileKeyboard.close()
}

function continueMobileTyping() {
  if (statStore.timerPaused) statStore.resumeTimer()
  mobileKeyboard.open()
}


// ============ 音频 ============
const playWordAudio = usePlayWordAudio()

const volumeIconRef: any = $ref()
let isTypingWord = $ref(true)

const typingCoreRef = $ref<InstanceType<typeof WordTypingCore>>()
const wordMetaPanelRef = $ref<InstanceType<typeof WordMetaPanel>>()

const typeWordController = usePracticeTypeWordController({
  getWord: () => props.word,
  getPracticeType: () => props.practiceType,
  getPhaseKey: () => props.phaseKey,
  getIsWordMasked: () => effective.value.isWordMasked,
  getAutoPlayFirstSentence: () => settingStore.autoPlayFirstSentence,
  onWrong: source => emit('wrong', source),
  playWordAudio: (word, manual, onEnd) =>
    playWordAudio(word, manual, onEnd, () => {
      volumeIconRef?.animate(true)
    }),
  playFirstSentence: () => wordMetaPanelRef?.playSentence(0, { highlight: true }),
})
let { showFullWord, showWordResult } = $(typeWordController)

const localReveal = computed(() => ({
  showFullWord,
  showWordResult,
}))
const effective = useInjectedDisplayPolicy(localReveal)

function playWord(trigger: WordPlayTrigger) {
  if (trigger === WordPlayTrigger.Manual || settingStore.wordSound) typeWordController.playWord(trigger)
}

function onTypingCoreComplete() {
  if (
    [WordPracticeType.FollowWrite, WordPracticeType.Spell].includes(props.practiceType) &&
    settingStore.practiceSentence &&
    props.word.sentences.length
  ) {
    isTypingWord = false
    return wordMetaPanelRef.startPracticeSentence()
  }
  emit('complete')
}

function onTypingCoreWrong() {
  vibrateOnTypo()
  if (props.practiceType === WordPracticeType.Identify) {
    emit('wrong', 'identifyTyping')
    return
  }
  emit('wrong')
}

function onSentencePracticeComplete() {
  isTypingWord = true
  emit('complete')
}

// ============ 例句填空 ============
const isCloze = computed(() => props.practiceType === WordPracticeType.Cloze)
const clozeSentences = computed(() => (isCloze.value ? findClozeSentences(props.word) : []))
// 目前使用第幾句；每個字從不同句開始，「換一句」往下輪
let clozeIndex = $ref(0)
let clozeHintUsed = $ref(false)
const clozeSentence = computed(() => {
  const list = clozeSentences.value
  return list.length ? list[clozeIndex % list.length] : null
})
const ttsPlay = useTTsPlayAudio()
// 答對時顯示的中文：只取第一個詞性，太長就截斷
const CLOZE_TRANS_MAX_LENGTH = 30
const clozeShortTrans = computed(() => {
  const cn = props.word.trans?.[0]?.cn ?? ''
  return cn.length > CLOZE_TRANS_MAX_LENGTH ? cn.slice(0, CLOZE_TRANS_MAX_LENGTH) + '…' : cn
})

function resetCloze() {
  clozeHintUsed = false
  clozeIndex = props.word.word.length % Math.max(1, clozeSentences.value.length)
}

function nextClozeSentence() {
  clozeIndex++
}

function playClozeSentence() {
  const text = clozeSentence.value?.text
  if (text) ttsPlay(text, { volume: settingStore.sentenceSoundVolume / 100, rate: settingStore.sentenceSoundSpeed })
}

// 提示首字母：用了算一次錯
function showClozeHint() {
  if (clozeHintUsed) return
  clozeHintUsed = true
  emit('wrong')
}

watch(
  [() => props.word, () => props.practiceType],
  () => {
    if (!isCloze.value) return
    resetCloze()
    // 沒有可以挖空的例句：自動跳過這一步，不算錯
    if (!clozeSentences.value.length) emit('complete')
  },
  { immediate: true }
)

// 答對時播放整句發音
watch(
  () => showWordResult,
  shown => {
    if (shown && isCloze.value && typingCoreRef?.isWordRight()) playClozeSentence()
  }
)

// ============ 記憶宮殿 ============
const isPalacePlace = computed(() => props.practiceType === WordPracticeType.PalacePlace)
const isPalaceRecall = computed(() => props.practiceType === WordPracticeType.PalaceRecall)
// 例句填空、記憶宮殿都有自己的畫面，不顯示一般練習的單字區與按鈕
const isCustomPanel = computed(() => isCloze.value || isPalacePlace.value || isPalaceRecall.value)
const practiceData = inject<PracticeData | undefined>('practiceData', undefined)

/** 目前單字在宮殿的位置：放置步驟依順序重新分配並記住；回想步驟讀記住的位置 */
const palaceAssignment = computed(() => {
  if (!isPalacePlace.value && !isPalaceRecall.value) return null
  const key = getPalaceKey(props.word)
  const saved = settingStore.palaceAssignments?.[key]
  if (isPalaceRecall.value && saved) return saved
  return assignByOrder(
    settingStore.palaces,
    settingStore.activePalaceId,
    practiceData?.index ?? 0,
    makePalaceBatch(store.sdict.id)
  )
})
const palaceInfo = computed(() => {
  const a = palaceAssignment.value
  if (!a) return null
  const palace = settingStore.palaces.find(p => p.id === a.palaceId) ?? settingStore.palaces[0]
  return {
    ...a,
    palace,
    locusName: palace?.loci[a.locus] ?? `位置 ${a.locus + 1}`,
  }
})
const palaceScene = computed(() => getLocusScene(palaceInfo.value?.palace, palaceInfo.value?.locus ?? 0))

/**
 * 場景卡上的兩格：目前這個字＋同一位置的另一個字。
 * 另一格依練習順序推算：前一個字（已看過／答過）變淡，後一個字顯示問號。
 */
const palaceSlots = computed<(PalaceSlotItem | null)[]>(() => {
  const info = palaceInfo.value
  if (!info) return []
  const slots: (PalaceSlotItem | null)[] = Array(WORDS_PER_LOCUS).fill(null)
  slots[info.slot] = {
    image: getWordImage(props.word),
    word: props.word.word,
    state: isPalaceRecall.value && !showWordResult ? 'blank' : 'active',
  }
  const words = practiceData?.words ?? []
  const index = practiceData?.index ?? 0
  for (let slot = 0; slot < WORDS_PER_LOCUS; slot++) {
    if (slot === info.slot) continue
    // 放置與回想都照路線順序、不打亂，所以同一位置的另一個字就在相鄰位置
    const other: Word | undefined = words[index + (slot - info.slot)]
    if (!other) continue
    slots[slot] = { image: getWordImage(other), word: other.word, state: slot < info.slot ? 'dim' : 'mystery' }
  }
  return slots
})
let palaceHintUsed = $ref(false)
// 晚於 event.ts 的自動聚焦（100ms）再收起鍵盤
const PALACE_KEYBOARD_CLOSE_DELAY_MS = 400

// 放置步驟：把分配結果記住，回想與複習時沿用
watch(
  [() => props.word, isPalacePlace],
  () => {
    palaceHintUsed = false
    if (!isPalacePlace.value || !palaceAssignment.value) return
    if (!settingStore.palaceAssignments) settingStore.palaceAssignments = {}
    const assignments = settingStore.palaceAssignments
    // 切換單字的瞬間 props.word 可能是空白預設值：不能放進宮殿，否則會把同一格的真單字擠掉
    delete assignments['']
    if (!props.word.word.trim()) return
    const next = palaceAssignment.value
    const key = getPalaceKey(props.word)
    // 同一批次的同一格只放一個字：重新開始學習時，舊的字從這一格移走
    for (const [k, a] of Object.entries(assignments)) {
      if (k !== key && a.batch === next.batch && a.palaceId === next.palaceId && a.locus === next.locus && a.slot === next.slot) {
        delete assignments[k]
      }
    }
    assignments[key] = { ...next }
    // 放置不用打字：收起鍵盤。練習頁開始時會延遲叫出鍵盤（event.ts），所以晚一點再收一次
    mobileKeyboard.close()
    setTimeout(() => isPalacePlace.value && mobileKeyboard.close(), PALACE_KEYBOARD_CLOSE_DELAY_MS)
  },
  { immediate: true }
)

function palacePlaceNext() {
  if (isPalacePlace.value) emit('complete')
}

// 回想時看中文：顯示中文意思，用了算一次錯
function showPalaceHint() {
  if (palaceHintUsed) return
  palaceHintUsed = true
  emit('wrong')
}

// ============ 单词操作 ============
function checkIsWrong() {
  if (effective.value.isWordMasked) {
    if (!showWordResult && !typingCoreRef?.isWordRight()) {
      emit('wrong')
    }
  }
}

function onVolumeIconClick() {
  checkIsWrong()
  playWord(WordPlayTrigger.Manual)
}

function play() {
  volumeIconRef?.play()
}

function showWord() {
  typeWordController.showWord()
}

function hideWord() {
  typeWordController.hideWord()
}

const wordWrapRef = useTemplateRef('word-wrap')
function onMouseEnter() {
  if (props.practiceType === WordPracticeType.Identify) return
  //解决：默写情况下，单词显示为下划线，而下划线的宽度比字母的宽度更宽，导致hover上去，单词立马显示，导致整个div的宽度变窄，这样又会立马触发mouseleave
  let rect = wordWrapRef.value.getBoundingClientRect()
  wordWrapRef.value.style.minWidth = rect.width + 'px'
  _nextTick(showWord)
}

// ============ 笔记 ============

let editingNote = $ref(false)
let noteInputValue = $ref('')

function editNote() {
  editingNote = !editingNote
  if (editingNote) {
    noteInputValue = store.noteData[props.word.word] ?? ''
  } else {
    noteInputValue = ''
  }
}

function saveNote() {
  if (noteInputValue.trim()) {
    store.noteData[props.word.word] = noteInputValue
  } else {
    delete store.noteData[props.word.word]
  }
  editingNote = false
}

function cancelNote() {
  editingNote = false
  noteInputValue = ''
}

function deleteNote() {
  delete store.noteData[props.word.word]
  editingNote = false
  noteInputValue = ''
}

// ============ 自测/WordTest 事件处理 ============
let showNotice = false

function onIdentifyKnow() {
  if (!showWordResult) {
    showWordResult = true
    onAnswerCorrect()
    if (!showNotice) {
      Toast.info($t('know_word_tip'), { duration: 5000 })
      showNotice = true
    }
  }
}

function onAnswerWrong() {
  typingCoreRef?.setWordTestResult?.(false, props.word.word)
  emit('wrong')
  playWord(WordPlayTrigger.Typo)
}

function onAnswerCorrect() {
  typingCoreRef?.setWordTestResult?.(true, props.word.word)
  emit('know')
}

function onIdentifyUnknown() {
  if (!showWordResult) {
    showWordResult = true
    emit('wrong')
    playWord(WordPlayTrigger.Typo)
  }
}

function onIdentifyMastered() {
  emit('mastered')
}

// ============ 提示 Toast ============

const notice = $computed(() => {
  let text = ''
  let show = false
  if (props.practiceType === WordPracticeType.Identify) {
    if (showWordResult) {
      text = typingCoreRef?.isWordRight() ? '按空格键继续' : '请拼写单词'
      show = true
    }
  } else if (props.practiceType === WordPracticeType.Listen) {
    if (showWordResult) {
      text = '按空格键继续'
      show = true
    }
  } else if (isWholeWordJudgeType(props.practiceType)) {
    text = showWordResult
      ? typingCoreRef?.isWordRight()
        ? '按空格键继续'
        : $t('press_delete_reinput')
      : '按空格键完成默写'
    show = true
  } else {
    text = '输入完成后按空格键继续'
    show = true
  }
  return { show, text }
})

// ============ 重置：单词切换时 reset identify / note 状态 ============

watch([() => props.word, () => props.phaseKey], onResetWord)

// keyup 时隐藏单词
useOnKeyboardEventListener(
  () => {},
  () => {
    hideWord()
  }
)

function onResetWord() {
  isTypingWord = true
  typeWordController.reset()
  editingNote = false
  noteInputValue = ''
  if (wordWrapRef.value) wordWrapRef.value.style.minWidth = 'unset'
}

// ============ 收藏 / 简词 ============

const { isWordCollect, toggleWordCollect, isWordSimple, toggleWordSimple } = useWordOptions()
const collectAnchorRef = ref<HTMLElement | null>(null)

function openCollectPicker(e: MouseEvent) {
  e?.stopPropagation?.()
  openWordCollectPicker(props.word, e.currentTarget as HTMLElement, {
    excludeDictId: store.sdict.id ? String(store.sdict.id) : undefined,
  })
}

const isCollect = $computed(() => isWordCollect(props.word))
const isSimple = $computed(() => isWordSimple(props.word))
const showNote = $computed(() => {
  if (editingNote) return true
  if (store.noteData[props.word.word]?.trim()) {
    return settingStore.alwaysShowNote ? true : props.practiceType === WordPracticeType.FollowWrite || showWordResult
  }
  return false
})

function collect() {
  toggleWordCollect(props.word)
}

useEvents([
  [EventKey.resetWord, onResetWord],
  //当默写时，执行 show 会标记为错误，并更新卡片
  [ShortcutKey.ShowWord, throttle(showWord, 300)],
  [ShortcutKey.ToggleCollect, collect],
  [ShortcutKey.CollectToDict, () => openCollectPicker({ currentTarget: collectAnchorRef.value } as any)],
  [ShortcutKey.PlayWordPronunciation, play],
  // 宮殿放置：空白鍵進下一個
  [
    EventKey.onTyping,
    (e: KeyboardEvent) => {
      if (isPalacePlace.value && (e.code === 'Space' || e.key === ' ')) palacePlaceNext()
    },
  ],
])
</script>

<template>
  <div
    class="typing-word"
    :class="{ 'mobile-typing': isMob && mobileKeyboard.isOpen.value, 'mobile-detail': mobileDetail }"
    :data-no-refocus="mobileDetail || isPalacePlace ? '' : undefined"
    v-if="word.word.length"
  >
    <div class="flex flex-col items-center">
      <!-- 記憶宮殿：放置（只看不打） -->
      <PalacePlacePanel
        v-if="isPalacePlace && palaceInfo"
        :word="word"
        :scene="palaceScene"
        :locus-name="palaceInfo.locusName"
        :locus-index="palaceInfo.locus"
        :locus-count="palaceInfo.palace?.loci.length ?? 0"
        :slots="palaceSlots"
        @next="palacePlaceNext"
        @play="onVolumeIconClick"
      />

      <!-- 記憶宮殿：回想（只給位置，打出單字） -->
      <div class="palace-recall" v-if="isPalaceRecall && palaceInfo">
        <div class="palace-route">
          <span
            v-for="i in palaceInfo.palace?.loci.length ?? 0"
            :key="i"
            :class="i - 1 < palaceInfo.locus ? 'done' : i - 1 === palaceInfo.locus ? 'on' : ''"
          ></span>
        </div>
        <PalaceSceneCard
          class="mt-3 palace-recall-scene"
          :scene="palaceScene"
          :locus-name="palaceInfo.locusName"
          :locus-index="palaceInfo.locus"
          :slots="palaceSlots"
        />
        <div class="palace-recall-q">跳動的圖是哪個字？（{{ word.word.length }} 個字母）</div>
        <div class="cloze-gap palace-gap" :class="showWordResult && (typingCoreRef?.isWordRight() ? 'ok' : 'bad')">
          <WordTypingCore
            ref="typingCoreRef"
            :word="word"
            :active="isTypingWord && !editingNote"
            :practiceType="practiceType"
            :isWordMasked="effective.isWordMasked"
            v-model:showWordResult="showWordResult"
            :showFullWord="showFullWord"
            :wordFontSize="26"
            @play="playWord"
            @complete="onTypingCoreComplete"
            @wrong="onTypingCoreWrong"
          />
        </div>
        <div class="palace-hint" v-if="palaceHintUsed && !showWordResult">
          {{ word.trans?.[0]?.pos }} {{ clozeShortTrans }}
        </div>
        <div class="cloze-actions" data-no-refocus @pointerdown.prevent>
          <button class="mobile-chip" @click="showPalaceHint">💬 看中文</button>
          <button class="mobile-chip" @click="onVolumeIconClick">🔊 發音</button>
          <button class="mobile-chip" @click="emit('skip')">⏭ {{ $t('skip_word') }}</button>
        </div>
        <div class="cloze-result" v-if="showWordResult" :class="typingCoreRef?.isWordRight() ? 'ok' : 'bad'">
          <template v-if="typingCoreRef?.isWordRight()">
            ✓ <b>{{ word.word }}</b> {{ word.trans?.[0]?.pos }} {{ clozeShortTrans }}
          </template>
          <template v-else>✗ 正確答案：<b>{{ word.word }}</b>　{{ word.trans?.[0]?.pos }} {{ clozeShortTrans }}</template>
        </div>
      </div>

      <!-- 例句填空：中文句子＋挖空的英文例句 -->
      <div class="cloze-panel" v-if="isCloze && clozeSentence">
        <div class="cloze-cn">{{ clozeSentence.cn }}</div>
        <div class="cloze-sentence">
          <span>{{ clozeSentence.before }}</span>
          <span class="cloze-gap" :class="showWordResult && (typingCoreRef?.isWordRight() ? 'ok' : 'bad')">
            <WordTypingCore
              ref="typingCoreRef"
              :word="word"
              :active="isTypingWord && !editingNote"
              :practiceType="practiceType"
              :isWordMasked="effective.isWordMasked"
              v-model:showWordResult="showWordResult"
              :showFullWord="showFullWord"
              :wordFontSize="24"
              @play="playWord"
              @complete="onTypingCoreComplete"
              @wrong="onTypingCoreWrong"
            />
          </span>
          <span>{{ clozeSentence.after }}</span>
        </div>
        <div class="cloze-meta">
          {{ word.trans?.[0]?.pos ? word.trans[0].pos + ' · ' : '' }}{{ word.word.length }} 個字母
          <template v-if="clozeHintUsed"> · 首字母 {{ word.word[0] }}</template>
          · 句子 {{ (clozeIndex % clozeSentences.length) + 1 }} / {{ clozeSentences.length }}
        </div>
        <div class="cloze-actions" data-no-refocus @pointerdown.prevent>
          <button class="mobile-chip" @click="playClozeSentence">🔊 聽句子</button>
          <button class="mobile-chip" @click="showClozeHint">💡 提示首字母</button>
          <button class="mobile-chip" @click="nextClozeSentence">⇆ 換一句</button>
          <button class="mobile-chip" @click="emit('skip')">⏭ {{ $t('skip_word') }}</button>
        </div>
        <div class="cloze-result" v-if="showWordResult" :class="typingCoreRef?.isWordRight() ? 'ok' : 'bad'">
          <template v-if="typingCoreRef?.isWordRight()">
            ✓ <b>{{ word.word }}</b> {{ word.phonetic1 ? '/' + word.phonetic1 + '/' : '' }}
            {{ word.trans?.[0]?.pos }} {{ clozeShortTrans }}
          </template>
          <template v-else>✗ 正確答案：<b>{{ word.word }}</b></template>
        </div>
      </div>

      <template v-if="!isCustomPanel">
      <!-- 音标 + 发音按钮（通过 slot 传入 VolumeIcon） -->
      <div class="flex gap-1 mt-10 md:mt-30">
        <div
          class="phonetic"
          :class="effective.isWordMasked && 'word-shadow'"
          v-if="settingStore.soundType === 'uk' && word.phonetic0"
        >
          / {{ word.phonetic0 }} /
        </div>
        <div
          class="phonetic"
          :class="effective.isWordMasked && 'word-shadow'"
          v-if="settingStore.soundType === 'us' && word.phonetic1"
        >
          / {{ word.phonetic1 }} /
        </div>
        <VolumeIcon
          :title="`发音(${settingStore.shortcutKeyMap[ShortcutKey.PlayWordPronunciation]})`"
          ref="volumeIconRef"
          :cb="onVolumeIconClick"
        />
      </div>

      <!-- 单词键入区 -->
      <!-- 手機點單字會觸發 hover 提示並蓋住音標，所以手機停用 -->
      <Tooltip :title="`快捷键(${settingStore.shortcutKeyMap[ShortcutKey.ShowWord]})显示单词信息`" :disabled="isMob">
        <div
          id="word-wrap"
          ref="word-wrap"
          class="word my-1"
          :style="{ fontSize: settingStore.fontSize.wordForeignFontSize + 'px' }"
          @mouseenter="onMouseEnter"
          @mouseleave="hideWord"
        >
          <WordTypingCore
            ref="typingCoreRef"
            :word="word"
            :active="isTypingWord && !editingNote"
            :practiceType="practiceType"
            :isWordMasked="effective.isWordMasked"
            v-model:showWordResult="showWordResult"
            :showFullWord="showFullWord"
            :wordFontSize="settingStore.fontSize.wordForeignFontSize"
            @play="playWord"
            @complete="onTypingCoreComplete"
            @wrong="onTypingCoreWrong"
          />
        </div>
      </Tooltip>

      </template>

      <!-- 手機版：打字時的按鈕列（例句填空有自己的按鈕列） -->
      <div class="mobile-actions" v-if="isMob && mobileKeyboard.isOpen.value && !isCustomPanel" data-no-refocus @pointerdown.prevent>
        <button class="mobile-chip" @click="onVolumeIconClick">
          <IconFluentSpeaker20Regular /> {{ $t('mobile_pronounce') }}
        </button>
        <button class="mobile-chip" @click="enterMobileDetail">
          <IconFluentDocumentText20Regular /> {{ $t('mobile_view_detail') }}
        </button>
        <button class="mobile-chip" @click="emit('skip')">
          <IconFluentArrowBounce20Regular class="transform-rotate-180" /> {{ $t('skip_word') }}
        </button>
      </div>

      <!-- 操作按钮行 -->
      <div class="mt-1 flex gap-4 desktop-actions" v-if="!isCustomPanel">
        <BaseIcon
          @click="emit('toggleSimple')"
          :title="
            (!isSimple ? $t('mark_mastered') : $t('unmark_mastered')) +
            `(${settingStore.shortcutKeyMap[ShortcutKey.ToggleSimple]})`
          "
        >
          <IconFluentCheckmarkCircle16Regular v-if="!isSimple" />
          <IconFluentCheckmarkCircle16Filled v-else />
        </BaseIcon>
        <BaseIcon @click="editNote" :title="editingNote ? '完成编辑笔记' : '编辑笔记'">
          <IconFluentClipboardTextEdit20Regular />
        </BaseIcon>
        <BaseIcon
          @click="collect"
          :title="
            (!isCollect ? $t('collect') : $t('uncollect')) +
            `(${settingStore.shortcutKeyMap[ShortcutKey.ToggleCollect]})`
          "
        >
          <IconFluentStar20Regular v-if="!isCollect" />
          <IconFluentStar20Filled v-else />
        </BaseIcon>
        <span ref="collectAnchorRef" class="inline-flex">
          <BaseIcon
            class="word-collect-anchor"
            @click="openCollectPicker"
            :title="`${$t('collect_to_dict')}(${settingStore.shortcutKeyMap[ShortcutKey.CollectToDict]})`"
          >
            <IconFluentStarAdd16Regular />
          </BaseIcon>
        </span>
        <BaseIcon @click="emit('skip')" :title="`${$t('skip_word')}(${settingStore.shortcutKeyMap[ShortcutKey.Next]})`">
          <IconFluentArrowBounce20Regular class="transform-rotate-180" />
        </BaseIcon>
      </div>

      <!-- 笔记编辑区 -->
      <template v-if="showNote">
        <div class="flex flex-col gap-2 w-full mt-4">
          <div class="flex">
            <div class="label">笔记</div>
            <Textarea
              autofocus
              v-if="editingNote"
              v-model="noteInputValue"
              placeholder="记录这个单词的个人笔记"
              :autosize="{ minRows: 4, maxRows: 8 }"
              class="note-textarea"
            />
            <div v-else class="note-content">{{ store.noteData[word.word] }}</div>
          </div>
          <div v-if="editingNote" class="flex justify-end mt-2">
            <BaseButton size="large" type="info" v-if="store.noteData[word.word]" @click="deleteNote">删除</BaseButton>
            <BaseButton size="large" @click="cancelNote">取消</BaseButton>
            <BaseButton size="large" type="primary" @click="saveNote">保存</BaseButton>
          </div>
        </div>
        <div class="line-white my-3"></div>
      </template>

      <!-- 提示 Toast -->
      <div class="center mt-3" v-if="notice.show && settingStore.showUsageTips && !isCustomPanel">
        <ToastComponent
          :duration="0"
          confirm
          :anim="false"
          :shadow="false"
          :message="notice.text"
          :showClose="store.sdict.statistics.length > 2"
          @close="settingStore.showUsageTips = false"
        />
      </div>

      <!-- 自测 UI -->
      <WordIdentifyPanel
        v-if="!showWordResult && !showFullWord && practiceType === WordPracticeType.Identify"
        :key="word.word"
        :word="word"
        :question="question"
        @know="onIdentifyKnow"
        @unknown="onIdentifyUnknown"
        @mastered="onIdentifyMastered"
        @wrong="onAnswerWrong"
        @correct="onAnswerCorrect"
        @complete="emit('complete')"
        @quickMark="emit('quickMark')"
      />

      <!-- WordMetaPanel: 翻译 + 例句 + 短语 + 词源 等展示 -->
      <!--      不要加key，里面有个只显示一次的变量-->
      <WordMetaPanel
        v-if="!isCustomPanel"
        ref="wordMetaPanelRef"
        :word="word"
        @complete="onSentencePracticeComplete"
        :effective="effective"
        @wrong="emit('wrong')"
      />
    </div>
    <WordLookupPopover />

    <!-- 手機版：鍵盤上方工具列 -->
    <div class="mobile-keyboard-bar" v-if="isMob && mobileKeyboard.isOpen.value" data-no-refocus @pointerdown.prevent>
      <button @click="collect">
        <IconFluentStar20Filled v-if="isCollect" />
        <IconFluentStar20Regular v-else />
        {{ $t('collect') }}
      </button>
      <button @click="emit('toggleSimple')">
        <IconFluentCheckmarkCircle16Filled v-if="isSimple" />
        <IconFluentCheckmarkCircle16Regular v-else />
        {{ $t('mark_mastered') }}
      </button>
      <button @click="enterMobileDetail">
        <IconFluentChevronDown20Regular />
        {{ $t('mobile_hide_keyboard') }}
      </button>
    </div>

    <!-- 手機版：看詳情時，底部固定「繼續打字」 -->
    <div class="mobile-continue" v-if="mobileDetail">
      <BaseButton size="large" type="primary" class="w-full" @click="continueMobileTyping">
        <IconFluentKeyboard20Regular class="mr-1" /> {{ $t('mobile_continue_typing') }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.typing-word {
  width: 100%;
  flex: 1;
  word-break: break-word;
  position: relative;
  color: var(--color-font-2);

  .phonetic {
    color: var(--color-font-1);
    font-family: var(--word-font-family);
    font-size: 1.2rem;
  }

  .word {
    font-size: 3rem;
    line-height: 1;
    font-family: var(--en-article-family);
    letter-spacing: 0.3rem;
  }

  .is-wrong {
    animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  .input,
  .right {
    color: rgb(22, 163, 74);
  }

  .wrong {
    color: rgba(red, 0.6);
  }

  .label {
    width: 6rem;
    flex-shrink: 0;
  }

  .note-content {
    @apply whitespace-pre-wrap;
  }
}

@media (max-width: 768px) {
  .typing-word {
    .label {
      @apply w-unset mr-2;
    }
  }
}

// ============ 手機版 ============
.mobile-actions {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.8rem;
}

.mobile-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
  padding: 0.45rem 0.8rem;
  border-radius: 1.2rem;
  border: 1px solid var(--color-item-border);
  background: var(--color-second);
  color: var(--color-main-text);
}

.mobile-keyboard-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--mobile-keyboard-offset, 0px);
  height: 2.6rem;
  z-index: 1001;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: var(--color-second);
  border-top: 1px solid var(--color-item-border);

  button {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.85rem;
    color: var(--color-main-text);
    background: none;
    border: none;
  }
}

.mobile-continue {
  position: fixed;
  left: 1rem;
  right: 1rem;
  bottom: calc(0.8rem + env(safe-area-inset-bottom, 0px));
  z-index: 1001;
}

// 打字模式：鍵盤擋住下半部，只留單字、2 行中文；例句等收進「看詳情」
.mobile-typing {
  .desktop-actions {
    display: none;
  }

  :deep(.word-meta) {
    .translate {
      font-size: 1rem;
    }

    > :not(.translate):not(:has(.sentence-highlight)) {
      display: none;
    }

    // 只顯示前 2 個詞性（第 1 個子元素是沒有詞性的翻譯）
    .translate > div > .flex:nth-child(n + 4) {
      display: none;
    }
  }
}

// 看詳情模式：內容可捲動，底部留位置給「繼續打字」
.mobile-detail {
  overflow-y: auto;
  padding-bottom: 6rem;
}

// ============ 例句填空 ============
.cloze-panel {
  width: 100%;
  max-width: 44rem;
  margin-top: 2.5rem;
  text-align: center;

  .cloze-cn {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--color-font-1);
  }

  .cloze-sentence {
    font-family: var(--en-article-family);
    font-size: 1.4rem;
    line-height: 2;
    margin-top: 0.8rem;
  }

  .cloze-gap {
    display: inline-block;
    min-width: 6rem;
    border-bottom: 3px solid var(--color-select-bg, #3b82f6);
    padding: 0 0.3rem;
    letter-spacing: 0.1rem;

    &.ok {
      border-color: rgb(22, 163, 74);
    }

    &.bad {
      border-color: rgb(220, 38, 38);
    }

    // 例句填空只顯示輸入，不顯示默寫的整字與底線框
    :deep(.typing-core) {
      display: inline-block;

      .letter {
        display: none;
      }

      .dictation {
        min-width: 0;
        margin: 0;
        padding: 0;
        border: none;
        display: inline;
      }
    }
  }

  .cloze-meta {
    font-size: 0.85rem;
    color: var(--color-font-3, #888);
    margin-top: 0.6rem;
  }

  .cloze-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .cloze-result {
    margin-top: 1rem;
    padding: 0.7rem 1rem;
    border-radius: 0.6rem;
    font-size: 0.95rem;

    &.ok {
      background: #dcfce7;
      color: #166534;
    }

    &.bad {
      background: #fee2e2;
      color: #991b1b;
    }
  }
}

@media (max-width: 768px) {
  .cloze-panel {
    margin-top: 1rem;

    .cloze-sentence {
      font-size: 1.2rem;
      line-height: 1.8;
    }
  }
}

// ============ 記憶宮殿：回想 ============
.palace-recall {
  width: 100%;
  max-width: 36rem;
  margin-top: 1.5rem;
  text-align: center;

  .palace-route {
    display: flex;
    gap: 0.35rem;
    justify-content: center;

    span {
      width: 1.4rem;
      height: 0.35rem;
      border-radius: 0.2rem;
      background: var(--color-item-border);

      &.done {
        background: #fcd34d;
      }

      &.on {
        background: #b45309;
      }
    }
  }

  .palace-locus-idx {
    font-size: 0.8rem;
    color: #b45309;
    font-weight: 600;
    margin-top: 1rem;
  }

  .palace-locus-name {
    font-size: 1.6rem;
    font-weight: 700;
    margin-top: 0.2rem;
  }

  // 回想時鍵盤佔掉下半部，場景卡縮小
  .palace-recall-scene {
    max-width: 15rem;
    margin-left: auto;
    margin-right: auto;
  }

  .palace-recall-q {
    font-size: 0.9rem;
    color: var(--color-font-3, #888);
    margin-top: 0.4rem;
  }

  .palace-gap {
    display: inline-block;
    margin-top: 0.3rem;
    font-family: var(--en-article-family);
    font-size: 1.6rem;
    min-width: 10rem;
    min-height: 2.4rem;
    padding: 0 0.3rem;
    border-bottom: 3px solid var(--color-select-bg, #3b82f6);
    letter-spacing: 0.1rem;

    &.ok {
      border-color: rgb(22, 163, 74);
    }

    &.bad {
      border-color: rgb(220, 38, 38);
    }

    // 只顯示輸入內容，不顯示默寫的整字與滿版底線（底線由 .cloze-gap 提供）
    :deep(.typing-core) {
      display: inline-block;

      .letter {
        display: none;
      }

      .dictation {
        min-width: 0;
        margin: 0;
        padding: 0;
        border: none;
        display: inline;
      }
    }
  }

  .palace-hint {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 0.75rem;
    padding: 0.6rem 0.8rem;
    margin-top: 0.8rem;
    text-align: left;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #1f2937;
  }
}
</style>
