<script setup lang="ts">
import { useSettingStore } from '@/core/stores/setting.ts'
import {
  createPalace,
  getLocusScene,
  PALACE_SCENE_OPTIONS,
  type Palace,
} from '@/core/composables/practice-words/practice-palace.ts'
import { BaseButton, Switch } from '@/base'
import SettingItem from '@/components/setting/SettingItem.vue'

// 記憶宮殿設定：選使用中的宮殿、編輯位置名稱與順序
const settingStore = useSettingStore()

const activePalace = $computed(() => settingStore.palaces.find(p => p.id === settingStore.activePalaceId) ?? settingStore.palaces[0])

/** 舊資料沒有 scenes：依位置名稱補上，之後的調整順序／刪除才能和位置一起移動 */
function ensureScenes(palace: Palace) {
  if (!palace.scenes || palace.scenes.length !== palace.loci.length) {
    palace.scenes = palace.loci.map((_, i) => getLocusScene(palace, i))
  }
  return palace.scenes
}

function addPalace() {
  const palace = createPalace(`宮殿 ${settingStore.palaces.length + 1}`)
  settingStore.palaces.push(palace)
  settingStore.activePalaceId = palace.id
}

function removePalace() {
  if (settingStore.palaces.length <= 1 || !activePalace) return
  if (!window.confirm(`刪除「${activePalace.name}」？放在這座宮殿的單字之後會重新分配位置。`)) return
  settingStore.palaces = settingStore.palaces.filter(p => p.id !== activePalace.id)
  settingStore.activePalaceId = settingStore.palaces[0].id
}

function moveLocus(index: number, delta: number) {
  const loci = activePalace.loci
  const scenes = ensureScenes(activePalace)
  const target = index + delta
  if (target < 0 || target >= loci.length) return
  ;[loci[index], loci[target]] = [loci[target], loci[index]]
  ;[scenes[index], scenes[target]] = [scenes[target], scenes[index]]
}

function removeLocus(index: number) {
  if (activePalace.loci.length <= 1) return
  ensureScenes(activePalace).splice(index, 1)
  activePalace.loci.splice(index, 1)
}

function addLocus() {
  ensureScenes(activePalace).push('room')
  activePalace.loci.push(`位置 ${activePalace.loci.length + 1}`)
}
</script>

<template>
  <div class="palace-setting">
    <SettingItem :title="$t('practice_palace')" :desc="$t('practice_palace_desc')">
      <Switch v-model="settingStore.practicePalace" />
    </SettingItem>

    <div class="line my-3"></div>
    <div class="palace-tabs">
      <button
        v-for="p in settingStore.palaces"
        :key="p.id"
        class="palace-tab"
        :class="{ active: p.id === settingStore.activePalaceId }"
        @click="settingStore.activePalaceId = p.id"
      >
        {{ p.icon }} {{ p.name }}
      </button>
      <button class="palace-tab add" @click="addPalace">＋ {{ $t('palace_add') }}</button>
    </div>

    <template v-if="activePalace">
      <div class="palace-name-row">
        <input class="palace-input icon" v-model="activePalace.icon" maxlength="2" />
        <input class="palace-input" v-model="activePalace.name" />
      </div>
      <div class="palace-tip">{{ $t('palace_route_tip', { count: activePalace.loci.length, words: activePalace.loci.length * 2 }) }}</div>

      <div class="locus-list">
        <div class="locus-row" v-for="(locus, i) in activePalace.loci" :key="i">
          <span class="num">{{ i + 1 }}</span>
          <input class="palace-input" v-model="activePalace.loci[i]" />
          <!-- 位置的場景插圖 -->
          <select class="scene-select" :value="getLocusScene(activePalace, i)" @change="ensureScenes(activePalace)[i] = ($event.target as HTMLSelectElement).value as any">
            <option v-for="o in PALACE_SCENE_OPTIONS" :key="o.key" :value="o.key">{{ o.label.split(' ')[0] }}</option>
          </select>
          <button class="icon-btn" :disabled="i === 0" @click="moveLocus(i, -1)">↑</button>
          <button class="icon-btn" :disabled="i === activePalace.loci.length - 1" @click="moveLocus(i, 1)">↓</button>
          <button class="icon-btn" :disabled="activePalace.loci.length <= 1" @click="removeLocus(i)">✕</button>
        </div>
      </div>
      <div class="flex gap-space mt-3">
        <BaseButton @click="addLocus">＋ {{ $t('palace_add_locus') }}</BaseButton>
        <BaseButton type="info" v-if="settingStore.palaces.length > 1" @click="removePalace">
          {{ $t('palace_delete') }}
        </BaseButton>
        <BaseButton type="info" @click="$router.push('/palace')">🏠 {{ $t('palace_overview') }}</BaseButton>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.palace-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.palace-tab {
  padding: 0.4rem 0.9rem;
  border-radius: 1rem;
  border: 1px solid var(--color-item-border);
  background: var(--color-second);
  color: var(--color-main-text);
  cursor: pointer;

  &.active {
    border-color: #b45309;
    background: #fef3c7;
    color: #92400e;
    font-weight: 600;
  }
}

.palace-name-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.8rem;
}

.palace-input {
  flex: 1;
  min-width: 0;
  height: 2.2rem;
  padding: 0 0.6rem;
  border-radius: 0.4rem;
  border: 1px solid var(--color-item-border);
  background: var(--color-second);
  color: var(--color-main-text);
  font-size: 1rem;

  &.icon {
    flex: none;
    width: 3rem;
    text-align: center;
  }
}

.palace-tip {
  font-size: 0.85rem;
  color: var(--color-font-3, #888);
  margin-top: 0.4rem;
}

.locus-list {
  margin-top: 0.6rem;
}

.locus-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0;

  .num {
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.75rem;
    background: #fef3c7;
    color: #b45309;
    font-size: 0.75rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
  }
}

.scene-select {
  // 不用系統下拉箭頭（iOS 會把 Emoji 擠掉一半），點下去仍會跳出選單
  -webkit-appearance: none;
  appearance: none;
  text-align-last: center;
  padding: 0;
  width: 2.6rem;
  height: 2rem;
  border-radius: 0.4rem;
  border: 1px solid var(--color-item-border);
  background: var(--color-second);
  font-size: 1.1rem;
  text-align: center;
}

.icon-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 0.4rem;
  border: 1px solid var(--color-item-border);
  background: var(--color-second);
  color: var(--color-main-text);
  cursor: pointer;

  &:disabled {
    opacity: 0.35;
  }
}
</style>
